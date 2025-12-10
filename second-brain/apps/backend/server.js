// server.js — quick local backend (JS) to verify register/login/health
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_this";

app.use(cors({ origin: "http://localhost:3000", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization","x-user-id"] }));
app.use(bodyParser.json());

console.log("Starting quick JS server...");

// In-memory user store (for demo)
const users = [];

// health
app.get("/_health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email+password required" });

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return res.status(400).json({ error: "email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = { id: crypto.randomUUID(), email, passwordHash: hash, createdAt: new Date().toISOString() };
    users.push(user);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    console.log(`[AUTH] registered ${email} id=${user.id}`);
    return res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ error: "server_error", details: String(err) });
  }
});

// login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email+password required" });

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(400).json({ error: "user not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "invalid password" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    console.log(`[AUTH] logged in ${email} id=${user.id}`);
    return res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "server_error", details: String(err) });
  }
});

// chat handler
app.post("/api/chat", (req, res) => {
  const userId = String(req.headers["x-user-id"] || "");
  const message = String((req.body && req.body.message) || "").trim();
  if (!message) return res.status(400).json({ error: "message required" });

  // tokenizer + stopword set
  function tokenize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map(t => t.trim())
      .filter(Boolean);
  }
  const STOP = new Set([
    "a","an","the","is","are","am","i","me","you","he","she","it","we","they",
    "and","or","but","of","in","on","for","with","to","from","by","at","as",
    "this","that","these","those","be","been","was","were","do","did","does",
    "have","has","had","my","your","their","its","so","if","not","no","will",
    "can","could","would","should","about","what","which","who","whom","when",
    "where","why","how","all","any","some","one","two","three"
  ]);

  const tokens = tokenize(message);
  const meaningful = tokens.filter(t => !STOP.has(t) && t.length > 1);

  console.log(`[CHAT] raw="${message}" tokens=${JSON.stringify(tokens)} meaningful=${JSON.stringify(meaningful)}`);

  if (meaningful.length === 0) {
    return res.json({ reply: `No memories found for "${message}" (query is too short or stopword-only)`, used: [] });
  }

  return res.json({ reply: `I found 0 memory(ies) related to "${message}"`, used: [] });
});



app.listen(PORT, () => {
  console.log(`Quick JS backend listening on http://localhost:${PORT}`);
});
