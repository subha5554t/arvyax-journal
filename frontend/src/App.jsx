import { useState, useEffect, useCallback } from "react";

const API = "/api";

const AMBIENCES = [
  { value: "forest",   emoji: "🌲", label: "Forest" },
  { value: "ocean",    emoji: "🌊", label: "Ocean" },
  { value: "mountain", emoji: "⛰️",  label: "Mountain" },
  { value: "desert",   emoji: "🏜️",  label: "Desert" },
  { value: "meadow",   emoji: "🌸", label: "Meadow" },
  { value: "other",    emoji: "🌿", label: "Other" },
];

const EMOTION_EMOJIS = {
  calm: "😌", joyful: "😄", anxious: "😰", sad: "😢",
  angry: "😤", peaceful: "🕊️", grateful: "🙏", reflective: "🤔",
  energized: "⚡", overwhelmed: "😵",
};

function formatDate(dt) {
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Page (Login + Register)
// ─────────────────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    if (!form.email || !form.password) return setError("Please fill all fields");
    if (mode === "register" && !form.name) return setError("Name is required");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onAuth(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "20px" }}>
      <div className="card fade-up" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: "2rem", color: "var(--forest)", marginBottom: 4 }}>ArvyaX</h1>
        <p style={{ color: "var(--stone)", fontSize: 14, marginBottom: 28, fontStyle: "italic" }}>nature journal</p>

        <div className="tab-bar" style={{ marginBottom: 24 }}>
          <button className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(null); }}>Login</button>
          <button className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(null); }}>Register</button>
        </div>

        {mode === "register" && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Your Name</label>
            <input style={inputStyle} placeholder="John Doe" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" placeholder="you@email.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" placeholder="••••••••" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {error && <div className="error-toast" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
          onClick={handleSubmit} disabled={loading}>
          {loading
            ? <span className="loading-pulse"><span /><span /><span /></span>
            : mode === "login" ? "Login 🌿" : "Create Account 🌱"}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", color: "var(--stone)", display: "block", marginBottom: 6 };
const inputStyle = {
  width: "100%", padding: "10px 14px", border: "1.5px solid rgba(45,90,39,0.2)",
  borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 14,
  color: "var(--bark)", background: "white", outline: "none",
};

// ─────────────────────────────────────────────────────────────────────────────
// Write Tab
// ─────────────────────────────────────────────────────────────────────────────
function WriteTab({ token, onEntryCreated }) {
  const [ambience, setAmbience] = useState("forest");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit() {
    if (text.trim().length < 10) return setStatus({ type: "error", msg: "Please write at least 10 characters." });
    setLoading(true); setStatus(null);
    try {
      const res = await fetch(`${API}/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ambience, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: "success", msg: "Journal entry saved ✓" });
      setText("");
      onEntryCreated(data.entry);
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally { setLoading(false); }
  }

  return (
    <div className="card write-form fade-up">
      <h2>New Journal Entry</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Today's Ambience</label>
        <div className="ambience-grid">
          {AMBIENCES.map((a) => (
            <button key={a.value} className={`ambience-btn ${ambience === a.value ? "selected" : ""}`}
              onClick={() => setAmbience(a.value)}>
              <span>{a.emoji}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
      <label style={labelStyle}>How are you feeling?</label>
      <textarea className="journal-textarea"
        placeholder={`Describe your experience in the ${ambience}...`}
        value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
      <div className="char-count">{text.length} / 2000</div>
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="loading-pulse"><span /><span /><span /></span> : "Save Entry 🌿"}
      </button>
      {status && <div className={status.type === "success" ? "success-toast" : "error-toast"}>{status.msg}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Card
// ─────────────────────────────────────────────────────────────────────────────
function EntryCard({ entry, token, onAnalyzed }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(
    entry.emotion ? { emotion: entry.emotion, keywords: entry.keywords, summary: entry.summary } : null
  );
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/journal/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: entry.text, entryId: entry.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      onAnalyzed(entry.id, data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="entry-card">
      <div className="entry-header">
        <span className={`ambience-tag ${entry.ambience}`}>
          {AMBIENCES.find((a) => a.value === entry.ambience)?.emoji} {entry.ambience}
        </span>
        <span className="entry-date">{formatDate(entry.createdAt)}</span>
      </div>
      <p className="entry-text">{entry.text}</p>
      {analysis ? (
        <div className="analyze-result fade-up">
          <div style={{ marginBottom: 8 }}>
            <span className="emotion-badge">{EMOTION_EMOJIS[analysis.emotion] || "✨"} {analysis.emotion}</span>
            {analysis.fromCache && <span style={{ fontSize: 11, color: "var(--stone)", fontStyle: "italic" }}>cached</span>}
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>{analysis.summary}</p>
          <div className="keywords-row">
            {analysis.keywords?.map((kw) => <span key={kw} className="keyword-pill">{kw}</span>)}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-secondary" onClick={handleAnalyze} disabled={loading}>
            {loading ? <span className="loading-pulse"><span /><span /><span /></span> : "✨ Analyze Emotions"}
          </button>
          {error && <span style={{ fontSize: 12, color: "var(--error)" }}>{error}</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entries Tab
// ─────────────────────────────────────────────────────────────────────────────
function EntriesTab({ token, entries, loading, onAnalyzed }) {
  if (loading) return (
    <div>{[1,2,3].map((i) => (
      <div key={i} className="entry-card">
        <div className="skeleton" style={{ height: 14, width: "30%", marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 12, width: "100%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "80%" }} />
      </div>
    ))}</div>
  );

  if (!entries.length) return (
    <div className="empty-state">
      <div className="empty-icon">🌿</div>
      <p>No entries yet.<br />Write your first journal entry!</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--stone)", marginBottom: 16 }}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
      {entries.map((entry) => <EntryCard key={entry.id} entry={entry} token={token} onAnalyzed={onAnalyzed} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insights Tab
// ─────────────────────────────────────────────────────────────────────────────
function InsightsTab({ token }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/journal/insights`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setInsights)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="insights-grid">{[1,2,3,4].map((i) => (
    <div key={i} className="stat-card">
      <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 28, width: "50%" }} />
    </div>
  ))}</div>;

  if (!insights || insights.totalEntries === 0) return (
    <div className="empty-state">
      <div className="empty-icon">📊</div>
      <p>No insights yet.<br />Add entries and analyze emotions to see patterns.</p>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="insights-grid">
        {[
          { label: "Total Entries", value: insights.totalEntries, sub: "journal sessions" },
          { label: "Top Emotion", value: EMOTION_EMOJIS[insights.topEmotion] || "✨", sub: insights.topEmotion || "—" },
          { label: "Favourite Ambience", value: AMBIENCES.find((a) => a.value === insights.mostUsedAmbience)?.emoji || "🌿", sub: insights.mostUsedAmbience || "—" },
          { label: "Keywords Tracked", value: insights.recentKeywords.length, sub: "unique terms" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {insights.recentKeywords.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Recent Keywords</h3>
          <div className="keywords-row">
            {insights.recentKeywords.map((kw) => <span key={kw} className="keyword-pill" style={{ fontSize: 13, padding: "5px 14px" }}>{kw}</span>)}
          </div>
        </div>
      )}

      {insights.emotionTrend?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Recent Emotion Trend</h3>
          <div className="trend-list">
            {insights.emotionTrend.map((item, i) => (
              <div key={i} className="trend-item" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="trend-dot" />
                <span className="trend-emotion">{EMOTION_EMOJIS[item.emotion] || "·"} {item.emotion}</span>
                <span className={`ambience-tag ${item.ambience}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                  {AMBIENCES.find((a) => a.value === item.ambience)?.emoji} {item.ambience}
                </span>
                <span className="trend-date">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Root
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [tab, setTab] = useState("write");
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  function handleAuth(user, token) {
    setUser(user); setToken(token);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); setToken(null); setEntries([]);
  }

  const fetchEntries = useCallback(async () => {
    if (!token) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`${API}/journal`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      if (res.ok) setEntries(data.entries || []);
    } catch (_) {}
    finally { setLoadingEntries(false); }
  }, [token]);

  useEffect(() => {
    if ((tab === "entries" || tab === "insights") && token) fetchEntries();
  }, [tab, fetchEntries, token]);

  if (!user || !token) return (
    <>
      <div className="app-bg" />
      <AuthPage onAuth={handleAuth} />
    </>
  );

  return (
    <>
      <div className="app-bg" />
      <div className="app-shell">
        <header className="app-header">
          <h1>ArvyaX<span>nature journal</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="user-badge">
              <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: 13, color: "var(--bark)" }}>{user.name}</span>
            </div>
            <button onClick={handleLogout} style={{
              background: "none", border: "1.5px solid rgba(45,90,39,0.2)", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, color: "var(--stone)", cursor: "pointer"
            }}>Logout</button>
          </div>
        </header>

        <nav className="tab-bar">
          {[{ id: "write", label: "✍️ Write" }, { id: "entries", label: "📖 Entries" }, { id: "insights", label: "📊 Insights" }]
            .map((t) => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
        </nav>

        {tab === "write" && <WriteTab token={token} onEntryCreated={(e) => setEntries((p) => [e, ...p])} />}
        {tab === "entries" && <EntriesTab token={token} entries={entries} loading={loadingEntries} onAnalyzed={(id, a) => setEntries((p) => p.map((e) => e.id === id ? { ...e, ...a } : e))} />}
        {tab === "insights" && <InsightsTab token={token} />}
      </div>
    </>
  );
}
