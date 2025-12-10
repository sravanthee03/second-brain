// apps/backend/src/routes/debugMemories.ts
import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// simple in-memory store keyed by user header
if (!(globalThis as any)._SB_MEMORIES) (globalThis as any)._SB_MEMORIES = {};
const store = (globalThis as any)._SB_MEMORIES as Record<string, any[]>;

router.get("/", (req, res) => {
  const userId = String(req.headers["x-user-id"] || "");
  const mems = Array.isArray(store[userId]) ? store[userId] : [];
  res.json({ memories: mems });
});

router.post("/", express.json(), (req, res) => {
  const userId = String(req.headers["x-user-id"] || "");
  if (!userId) return res.status(401).json({ error: "unauthenticated - set x-user-id header" });
  const { title = "note", fullText } = req.body || {};
  if (!fullText || String(fullText).trim().length === 0) {
    return res.status(400).json({ error: "fullText required" });
  }
  const mem = {
    id: uuidv4(),
    title,
    fullText: String(fullText).trim(),
    createdAt: new Date().toISOString()
  };
  if (!store[userId]) store[userId] = [];
  store[userId].push(mem);
  console.log("[MEM SAVE] user:", userId, "id:", mem.id, "text:", mem.fullText.slice(0,60));
  res.json({ memory: mem });
});

export default router;
