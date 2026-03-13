const express = require("express");
const router = express.Router();
const https = require("https");
const auth = require("../middleware/auth");
const { getDb, run, all, get } = require("../database");
const cache = require("../cache");

function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content: `You are an emotion analysis assistant for a mindfulness journaling app.
Analyze the user's journal entry and respond ONLY with a valid JSON object.
No markdown, no explanation, just raw JSON.

Required JSON structure:
{
  "emotion": "<primary emotion: calm | joyful | anxious | sad | angry | peaceful | grateful | reflective | energized | overwhelmed>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "summary": "<one sentence summary of the user's mental state>"
}`,
        },
        { role: "user", content: prompt },
      ],
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve(json.choices[0].message.content);
        } catch (e) { reject(new Error("Failed to parse Groq response")); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// All journal routes require auth
router.use(auth);

// POST /api/journal
router.post("/", async (req, res) => {
  try {
    const { ambience, text } = req.body;
    const userId = req.user.id; // from JWT

    if (!ambience || !text)
      return res.status(400).json({ error: "Missing required fields: ambience, text" });

    const validAmbiences = ["forest", "ocean", "mountain", "desert", "meadow", "other"];
    if (!validAmbiences.includes(ambience))
      return res.status(400).json({ error: `ambience must be one of: ${validAmbiences.join(", ")}` });

    if (text.trim().length < 5)
      return res.status(400).json({ error: "Journal entry is too short" });

    const db = await getDb();
    run(db, `INSERT INTO journal_entries (user_id, ambience, text) VALUES (?, ?, ?)`, [userId, ambience, text.trim()]);
    const entry = get(db, `SELECT * FROM journal_entries WHERE rowid = last_insert_rowid()`);

    return res.status(201).json({ message: "Journal entry created successfully", entry: formatEntry(entry) });
  } catch (err) {
    console.error("POST /journal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/journal/insights
router.get("/insights", async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDb();
    const entries = all(db, `SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC`, [userId]);

    if (entries.length === 0)
      return res.json({ totalEntries: 0, topEmotion: null, mostUsedAmbience: null, recentKeywords: [], emotionTrend: [] });

    const emotionCounts = {};
    entries.forEach((e) => { if (e.emotion) emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1; });
    const topEmotion = Object.keys(emotionCounts).length > 0
      ? Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0][0] : null;

    const ambienceCounts = {};
    entries.forEach((e) => { ambienceCounts[e.ambience] = (ambienceCounts[e.ambience] || 0) + 1; });
    const mostUsedAmbience = Object.entries(ambienceCounts).sort((a, b) => b[1] - a[1])[0][0];

    const recentKeywords = [];
    const seen = new Set();
    entries.filter((e) => e.keywords).slice(0, 5).forEach((e) => {
      try {
        JSON.parse(e.keywords).forEach((kw) => {
          if (!seen.has(kw) && recentKeywords.length < 10) { recentKeywords.push(kw); seen.add(kw); }
        });
      } catch (_) {}
    });

    const emotionTrend = entries.slice(0, 7).map((e) => ({ date: e.created_at, emotion: e.emotion || "unanalyzed", ambience: e.ambience }));

    return res.json({ totalEntries: entries.length, topEmotion, mostUsedAmbience, recentKeywords, emotionTrend });
  } catch (err) {
    console.error("GET /insights error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/journal
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const db = await getDb();
    const entries = all(db, `SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
    const countRow = get(db, `SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?`, [userId]);
    return res.json({ entries: entries.map(formatEntry), total: countRow?.count || 0, limit, offset });
  } catch (err) {
    console.error("GET /journal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/journal/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { text, entryId } = req.body;
    if (!text || text.trim().length < 3)
      return res.status(400).json({ error: "text field is required" });

    const cached = cache.get(text);
    if (cached) {
      if (entryId) await saveAnalysisToEntry(entryId, cached);
      return res.json({ ...cached, fromCache: true });
    }

    const rawText = await callGroq(text.trim());
    const result = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    if (!result.emotion || !result.keywords || !result.summary)
      throw new Error("LLM returned incomplete analysis");

    cache.set(text, result);
    if (entryId) await saveAnalysisToEntry(entryId, result);
    return res.json({ ...result, fromCache: false });
  } catch (err) {
    console.error("POST /analyze error:", err.message);
    return res.status(500).json({ error: "Analysis failed: " + err.message });
  }
});

function formatEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id, userId: entry.user_id, ambience: entry.ambience,
    text: entry.text, emotion: entry.emotion || null,
    keywords: entry.keywords ? JSON.parse(entry.keywords) : null,
    summary: entry.summary || null, createdAt: entry.created_at,
  };
}

async function saveAnalysisToEntry(entryId, analysis) {
  try {
    const db = await getDb();
    run(db, `UPDATE journal_entries SET emotion = ?, keywords = ?, summary = ? WHERE id = ?`,
      [analysis.emotion, JSON.stringify(analysis.keywords), analysis.summary, entryId]);
  } catch (err) { console.error("Failed to persist analysis:", err); }
}

module.exports = router;
