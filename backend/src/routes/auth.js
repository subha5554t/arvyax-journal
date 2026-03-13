const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb, run, get } = require("../database");

const JWT_SECRET = process.env.JWT_SECRET || "arvyax_super_secret_change_in_production";
const JWT_EXPIRES = "7d";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const db = await getDb();

    const existing = get(db, "SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    run(db, "INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
      name.trim(),
      email.toLowerCase().trim(),
      hashed,
    ]);

    // Look up by email — more reliable than last_insert_rowid() in sql.js
    const user = get(db, "SELECT id, name, email, created_at FROM users WHERE email = ?", [email.toLowerCase().trim()]);

    if (!user) return res.status(500).json({ error: "User created but could not be retrieved" });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(201).json({
      message: "Account created successfully!",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const db = await getDb();
    const user = get(db, "SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);

    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      message: "Login successful!",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// GET /api/auth/me
router.get("/me", require("../middleware/auth"), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;