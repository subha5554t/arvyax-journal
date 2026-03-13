# 🌿 ArvyaX AI-Assisted Journal System

A full-stack mindfulness journaling application that uses LLM-powered emotion analysis to help users understand their mental state over time after immersive nature sessions.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18 or 20 LTS** (recommended) — Node 24 may cause issues
- Uses `sql.js` (pure JS SQLite — no Visual Studio / build tools needed)
- An [Groq API key]((https://console.groq.com/keys))

---

### Option 1 — Local Development

#### 1. Clone & Configure

```bash
git clone <repo-url>
cd arvyax-journal
```

#### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm run dev
# API running on http://localhost:5000
```

#### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
# UI running on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

### Option 2 — Docker (Recommended for production)

```bash
# Create a .env file in the project root
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Build and start
docker compose up --build

# App available at http://localhost:3000
```

---

## 📡 API Reference

All endpoints are prefixed with `/api/journal`.

### `POST /api/journal`
Create a new journal entry.

**Request:**
```json
{
  "userId": "123",
  "ambience": "forest",
  "text": "I felt calm today after listening to the rain."
}
```

**Response `201`:**
```json
{
  "message": "Journal entry created successfully",
  "entry": {
    "id": 1,
    "userId": "123",
    "ambience": "forest",
    "text": "I felt calm today after listening to the rain.",
    "emotion": null,
    "keywords": null,
    "summary": null,
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

---

### `GET /api/journal/:userId`
Retrieve all journal entries for a user.

**Query params:** `?limit=50&offset=0`

**Response `200`:**
```json
{
  "entries": [...],
  "total": 8,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/journal/analyze`
Run LLM emotion analysis on a text snippet.

**Request:**
```json
{
  "text": "I felt calm today after listening to the rain",
  "entryId": 1,
  "stream": false
}
```

**Response `200`:**
```json
{
  "emotion": "calm",
  "keywords": ["rain", "nature", "peace"],
  "summary": "User experienced relaxation during the forest session",
  "fromCache": false
}
```

> Set `"stream": true` to receive a Server-Sent Events stream instead.

---

### `GET /api/journal/insights/:userId`
Aggregated mental health insights for a user.

**Response `200`:**
```json
{
  "totalEntries": 8,
  "topEmotion": "calm",
  "mostUsedAmbience": "forest",
  "recentKeywords": ["focus", "nature", "rain"],
  "emotionTrend": [...]
}
```

---

## 🗂 Project Structure

```
arvyax-journal/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app + middleware
│   │   ├── database.js        # SQLite setup & schema
│   │   ├── cache.js           # In-memory LRU analysis cache
│   │   └── routes/
│   │       └── journal.js     # All journal API routes
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React application
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── README.md
└── ARCHITECTURE.md
```

---

## 🔑 Environment Variables

| Variable           | Required | Default              | Description                     |
|--------------------|----------|----------------------|---------------------------------|
| `ANTHROPIC_API_KEY`| ✅ Yes   | —                    | Anthropic Claude API key        |
| `PORT`             | No       | `5000`               | Backend server port             |
| `NODE_ENV`         | No       | `development`        | Node environment                |
| `CORS_ORIGIN`      | No       | `http://localhost:5173` | Allowed CORS origin          |
| `DB_PATH`          | No       | `./data/journal.db`  | SQLite database path            |

---

## 🌟 Bonus Features Implemented

| Feature                | Status | Details                                      |
|------------------------|--------|----------------------------------------------|
| Streaming LLM          | ✅     | `POST /api/journal/analyze` with `stream: true` uses SSE |
| Analysis Caching       | ✅     | In-memory LRU cache keyed by SHA-256 of text |
| Rate Limiting          | ✅     | 200 req/15min general; 10 req/min on analyze |
| Docker Setup           | ✅     | `docker-compose.yml` with health checks      |

---

## 🛠 Tech Stack

| Layer    | Technology               |
|----------|--------------------------|
| Backend  | Node.js 20 + Express 4   |
| Database | SQLite (better-sqlite3)  |
| LLM      | Anthropic Claude Haiku   |
| Frontend | React 18 + Vite          |
| Proxy    | Nginx (Docker)           |
