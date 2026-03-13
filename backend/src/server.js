require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const journalRoutes = require("./routes/journal");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10kb" }));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const analyzeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

app.use("/api/", generalLimiter);
app.use("/api/journal/analyze", analyzeLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/journal", journalRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`🌿 ArvyaX Journal API running on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) console.warn("⚠️  GROQ_API_KEY is not set");
  if (!process.env.JWT_SECRET) console.warn("⚠️  JWT_SECRET not set — using default (change in production!)");
});

module.exports = app;
