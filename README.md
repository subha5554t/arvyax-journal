# 🌿 ArvyaX — AI-Assisted Nature Journal

A full-stack mindfulness journaling app where users write about their nature sessions (forest, ocean, mountain) and get **AI-powered emotion analysis** to understand their mental state over time.

🔗 **Live Demo:** https://arvyax-journal-five.vercel.app  
🔧 **Backend API:** https://arvyax-journal-bhns.onrender.com

---

## ✨ Features

- 📝 **Journal Entries** — Write about your nature sessions with ambience tags
- 🤖 **AI Emotion Analysis** — Powered by Groq (Llama 3.3) to detect emotions, keywords and summaries
- 📊 **Insights Dashboard** — Track your top emotions, favourite ambience and recent keywords over time
- 🔐 **Authentication** — Register and login with JWT + bcrypt password hashing
- ⚡ **Analysis Caching** — LRU cache to avoid duplicate LLM calls
- 🚦 **Rate Limiting** — 200 req/15min general, 10 req/min on analyze
- 🌊 **Streaming LLM** — Optional SSE streaming for analysis responses
- 🐳 **Docker Support** — One command full stack deployment

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express 4 |
| Database | SQLite (sql.js — no native build needed) |
| LLM | Groq API (Llama 3.3 70B) |
| Auth | JWT + bcryptjs |
| Frontend | React 18 + Vite |
| Hosting | Render (backend) + Vercel (frontend) |
| Docker | Docker Compose + Nginx |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18 or 20 LTS
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the repo
```bash
git clone https://github.com/subha5554t/arvyax-journal.git
cd arvyax-journal
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your keys
npm install
npm run dev
# API running at http://localhost:5000
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
# App running at http://localhost:5173
```

---

## 🐳 Docker Setup (One Command)

```bash
# Create .env in root folder
echo "GROQ_API_KEY=your_key_here" > .env
echo "JWT_SECRET=your_secret_here" >> .env

# Start everything
docker compose up --build

# App available at http://localhost:3000
```

---

## 🔑 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
JWT_SECRET=your_long_random_secret
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DB_PATH=./data/journal.db
```

---

## 📡 API Reference

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |

### Journal Endpoints (🔐 Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/journal` | Create journal entry |
| GET | `/api/journal` | Get all entries for user |
| POST | `/api/journal/analyze` | Analyze emotions with AI |
| GET | `/api/journal/insights` | Get aggregated insights |

---

### Example — Create Entry
```bash
POST /api/journal
Authorization: Bearer <token>

{
  "ambience": "forest",
  "text": "I felt calm today after listening to the rain."
}
```

### Example — Analyze Emotions
```bash
POST /api/journal/analyze
Authorization: Bearer <token>

{
  "text": "I felt calm today after listening to the rain",
  "entryId": 1
}
```

Response:
```json
{
  "emotion": "calm",
  "keywords": ["rain", "nature", "peace"],
  "summary": "User experienced relaxation during the forest session",
  "fromCache": false
}
```

### Example — Get Insights
```bash
GET /api/journal/insights
Authorization: Bearer <token>
```

Response:
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
│   │   ├── server.js              # Express app + middleware
│   │   ├── database.js            # SQLite schema (users + entries)
│   │   ├── cache.js               # LRU analysis cache
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT auth middleware
│   │   └── routes/
│   │       ├── auth.js            # Register + Login
│   │       └── journal.js         # Journal CRUD + AI analysis
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Full React app (auth + journal UI)
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # Nature-themed design system
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── README.md
└── ARCHITECTURE.md
```

---

## 🌟 Bonus Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| Streaming LLM response | ✅ |
| Analysis caching (LRU) | ✅ |
| Rate limiting | ✅ |
| Docker setup | ✅ |
| Deployed demo | ✅ |


---

## 🚀 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://arvyax-journal-five.vercel.app |
| Backend | Render | https://arvyax-journal-bhns.onrender.com |

---

## 📄 License

MIT License — feel free to use this project for learning and reference.
