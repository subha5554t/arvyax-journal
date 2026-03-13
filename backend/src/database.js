const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/journal.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let _db = null;

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run("PRAGMA foreign_keys = ON;");

  // Users table
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      created_at TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
  `);

  // Journal entries table
  _db.run(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      ambience    TEXT    NOT NULL,
      text        TEXT    NOT NULL,
      emotion     TEXT,
      keywords    TEXT,
      summary     TEXT,
      created_at  TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
  `);

  _db.run(`CREATE INDEX IF NOT EXISTS idx_user ON journal_entries(user_id);`);
  saveDb();
  return _db;
}

function saveDb() {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function run(db, sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(db, sql, params = []) {
  return all(db, sql, params)[0] || null;
}

module.exports = { getDb, saveDb, run, all, get };
