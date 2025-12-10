// apps/backend/src/index.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRouter from "./routes/auth";




const app = express();
app.use(cors()); // allow all origins for local dev
app.use(bodyParser.json());

// --- simple file DB helpers ---
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const MEM_FILE = path.join(dataDir, "memories.json");
function readMemories(): any[] {
  if (!fs.existsSync(MEM_FILE)) return [];
  try {
    const raw = fs.readFileSync(MEM_FILE, "utf8") || "[]";
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function writeMemories(arr: any[]) {
  fs.writeFileSync(MEM_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// --- Health + debug routes ---
app.get("/_health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get("/debug/ping", (req, res) => res.send("pong"));

// --- GET /api/memories (safe listing) ---
app.get("/api/memories", (req, res) => {
  const memories = readMemories();
  res.json({ memories });
});
app.use("/api/auth", authRouter);

// --- POST /api/memories to add a memory (used by frontend) ---
app.post("/api/memories", (req, res) => {
  const { title = "note", fullText = "" } = req.body || {};
  if (!fullText || typeof fullText !== "string") {
    return res.status(400).json({ error: "fullText required" });
  }
  // DELETE /api/memories/:id
app.delete("/api/memories/:id", (req, res) => {
  const id = req.params.id;
  const memories = readMemories();

  const updated = memories.filter((m) => m.id !== id);

  if (updated.length === memories.length) {
    return res.status(404).json({ error: "Memory not found" });
  }

  writeMemories(updated);
  res.json({ ok: true, deletedId: id });
});

  const mems = readMemories();
  const newMem = {
    id: (Math.random().toString(16).slice(2) + Date.now().toString(16)),
    title,
    fullText,
    createdAt: new Date().toISOString()
  };
  mems.unshift(newMem);
  writeMemories(mems);
  res.json({ memory: newMem });
});

// ---------- Chat (search-based retriever) ----------
// Expects { message: "..." } in body
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.post("/api/chat", (req, res) => {
  const q = (req.body?.message || "").toString().trim();
  if (!q) return res.status(400).json({ error: "message required" });

  const memories = readMemories();

  // Build tokens but ignore very short tokens (like single letters)
  const rawTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const tokens = rawTokens.filter((t: string) => t.length >= 2); // ignore tokens < 2 chars

  // If all tokens were short (e.g. single-letter query), fallback to returning 0 results
  if (tokens.length === 0) {
    return res.json({ reply: `I found 0 memory(ies) related to "${q}"`, used: [] });
  }

  const scored = memories.map((m: any) => {
    const title = (m.title || "").toLowerCase();
    const text = (m.fullText || "").toLowerCase() + " " + title;
    let totalOcc = 0;
    let titleBonus = 0;

    for (const t of tokens) {
      const regWhole = new RegExp("\\b" + escapeRegex(t) + "\\b", "gi"); // prefer whole-word matches
      const occWhole = (text.match(regWhole) || []).length;
      totalOcc += occWhole;

      // Small bonus if token appears anywhere in the title
      if (title.includes(t)) titleBonus += 1;
    }

    // Compute normalized score (keeps short exact matches competitive, but prevents inflation)
    const lengthFactor = 1 + Math.log1p(Math.max(1, text.length));
    const rawScore = totalOcc + titleBonus * 0.75;
    const score = rawScore > 0 ? rawScore / lengthFactor : 0;

    return { memory: m, score };
  });

  // filter strictly-positive scores and sort descending
  const used = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);

  const reply = `I found ${used.length} memory(ies) related to "${q}"`;
  res.json({
    reply,
    used: used.map(u => ({ id: u.memory.id, memoryId: u.memory.id, score: Number(u.score.toFixed(4)), title: u.memory.title }))
  });
});

// --- final fallback route (at the very end) ---
// Return JSON for API calls and simple HTML for others.
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
  }
  res.status(404).type("text").send("<!doctype html><html><body>Not Found</body></html>");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
