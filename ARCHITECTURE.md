# 🏗 Architecture Documentation

## Current Architecture (Development)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                   React 18 + Vite SPA                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Node.js + Express (Port 5000)                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │  Routes  │  │ Rate Limit │  │     In-Memory LRU Cache  │ │
│  │ /journal │  │ (per-IP)   │  │   (SHA-256 keyed, 500)   │ │
│  └────┬─────┘  └────────────┘  └──────────────────────────┘ │
│       │                                                      │
│  ┌────▼──────────────────────┐  ┌──────────────────────┐    │
│  │    better-sqlite3         │  │   Anthropic SDK      │    │
│  │    (SQLite WAL mode)      │  │   Claude Haiku API   │    │
│  └───────────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. How would you scale this to 100,000 users?

### Database
- Migrate from **SQLite → PostgreSQL** (AWS RDS / Supabase). SQLite is single-writer; Postgres supports hundreds of concurrent connections and horizontal read replicas.
- Add **connection pooling** via `pgBouncer` or built-in pool (pg library) to avoid exhausting DB connections.
- Add **read replicas** to separate write (POST entry) from read (GET entries, GET insights) traffic. Insights queries can be served from replicas.
- Index `(user_id, created_at DESC)` for efficient per-user timeline queries (already in SQLite schema, carries over).

### API Server
- **Horizontally scale** Express instances behind a **load balancer** (AWS ALB / Nginx). Each instance is stateless — no shared memory.
- Use **PM2 cluster mode** initially (zero-cost, uses all CPU cores), then graduate to **Kubernetes pods** for auto-scaling.
- Move the in-memory analysis cache to **Redis** (`ioredis`) so all instances share the same cache. This also enables distributed rate limiting.

### LLM Layer
- Move LLM calls to an **async job queue** (BullMQ + Redis). The POST /analyze endpoint enqueues a job and returns `202 Accepted` immediately. The frontend polls for results or uses SSE.
- This decouples user-facing latency from LLM latency (which can be 1–5 seconds).

### Frontend
- Build the React app and host static assets on **CDN** (CloudFront / Vercel Edge).
- API responses for entries/insights should use **Cache-Control** headers where appropriate.

### Rough Scaling Estimate

| Scale     | Architecture                                      |
|-----------|---------------------------------------------------|
| 0–1k users | Current setup (SQLite + single Node process)    |
| 1k–10k    | PostgreSQL + PM2 cluster                         |
| 10k–100k  | Postgres read replicas + Redis + LB + job queue  |
| 100k+     | Kubernetes + Kafka for event streaming           |

---

## 2. How would you reduce LLM cost?

### Model Selection
- Already using **claude-haiku** (cheapest Anthropic model, ~$0.25/M input tokens). Haiku is 10× cheaper than Sonnet for this use case.
- Evaluate **open-source alternatives** (Llama 3 8B via Ollama / Groq) for self-hosted deployments where latency is acceptable.

### Caching
- The current in-memory LRU cache (SHA-256 of input text) avoids duplicate API calls for identical text.
- Persisting this cache to **Redis with TTL** (7 days) extends the benefit across server restarts and multiple instances.
- **Semantic caching**: embed texts and cache by cosine similarity — if a new entry is >95% similar to a cached one, reuse the result without a new API call.

### Batching
- **Anthropic Batches API**: submit up to 10,000 requests at once for 50% cost reduction. Suitable for bulk analysis of unanalyzed entries (e.g., a nightly backfill job).

### Prompt Optimization
- Current system prompt is ~120 tokens. Every call pays this cost. Using a **cached system prompt** (Anthropic prompt caching, 90% discount on repeated prefix) cuts cost for the system prompt to near zero.
- Trim journal entries to 500 tokens max before sending — users rarely write more than this.

### Lazy Analysis
- Don't analyze on entry save; analyze **on-demand** (current design). Inactive users never incur analysis costs.

---

## 3. How would you cache repeated analysis?

### Current Implementation
An in-memory `AnalysisCache` class (see `backend/src/cache.js`) uses:
- **SHA-256 hash** of the normalized text (trimmed, lowercased) as the cache key
- **LRU eviction**: when the cache reaches 500 entries, the oldest entry is removed
- Returns the cached result with `fromCache: true` flag so the client can display it

```
Request Text → SHA-256 → Cache Lookup
                              │
               ┌──────────────┴──────────────┐
            Cache HIT                     Cache MISS
               │                              │
          Return cached              Call Anthropic API
          (0ms, $0 cost)                      │
                                      Store in cache
                                      Return result
```

### Production Upgrade (Redis)
```js
// Cache key
const key = `analysis:${sha256(text)}`;

// Read-through pattern
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);

const result = await callLLM(text);
await redis.setEx(key, 604800, JSON.stringify(result)); // 7-day TTL
return result;
```

### Database-Level Caching
The `analyze` endpoint also accepts an optional `entryId`. When provided, the result is **persisted to the `journal_entries` row** (`emotion`, `keywords`, `summary` columns). On subsequent requests:
- If `entry.emotion` is already populated, the frontend shows it directly without calling `/analyze` again.
- This provides permanent caching at the data layer with no additional infrastructure.

---

## 4. How would you protect sensitive journal data?

Journal entries are deeply personal. A layered security approach is essential.

### Encryption at Rest
- **Database encryption**: Use SQLCipher (encrypted SQLite) in development; in production, Postgres with **Transparent Data Encryption** (TDE) or AWS RDS encrypted volumes (AES-256).
- **Field-level encryption**: Encrypt the `text` column before storing using AES-256-GCM with a key stored in **AWS KMS** or **HashiCorp Vault**. Even a DB breach won't expose plaintext entries.

```js
// Pseudocode
const { encrypted, iv } = encryptAES(entry.text, kmsKey);
db.insert({ ...entry, text: encrypted, iv });
```

### Authentication & Authorization
- Replace `userId` string parameter with **JWT authentication**. Users can only read/write their own entries.
- Use `req.user.id` (from decoded JWT) instead of trusting a userId from the request body.
- Add **row-level security** in Postgres: `CREATE POLICY journal_rls ON journal_entries USING (user_id = current_user_id())`.

### Transport Security
- Enforce **HTTPS** in production (Let's Encrypt / AWS ACM). All API traffic uses TLS 1.3.
- Set security headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`.

### API Security
- **API key / OAuth2** for third-party integrations instead of plain userId.
- Input validation and sanitization is already enforced (text length limits, ambience enum check).
- Rate limiting already implemented to prevent abuse and data scraping.

### Data Minimization
- Don't log the full entry text in server logs — only log the entry ID.
- Set a **data retention policy**: auto-delete entries older than X years per user preference.
- Offer users **data export and deletion** (GDPR-compliant).

### LLM Privacy
- Avoid sending PII to external LLM providers when possible. Consider **on-premise models** (Ollama) for users with strict privacy requirements.
- Use **Anthropic's zero data retention** API option for sensitive use cases.

---

## Data Model

```sql
CREATE TABLE journal_entries (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT     NOT NULL,                        -- Indexed
  ambience   TEXT     NOT NULL,                        -- forest | ocean | mountain | ...
  text       TEXT     NOT NULL,                        -- Journal content
  emotion    TEXT,                                     -- LLM result
  keywords   TEXT,                                     -- JSON array
  summary    TEXT,                                     -- LLM summary
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP        -- Indexed
);
```

All LLM analysis results are stored back in the same row to avoid a separate `analyses` table — keeping queries simple and analysis results co-located with entries.
