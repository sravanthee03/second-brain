// apps/backend/src/routes/memories.ts
import express from "express";
import { addMemory, getMemoriesByUser } from "../data/memoryStore";
import { createEmbedding } from "../utils/embeddings";
import crypto from "crypto";

const router = express.Router();

/**
 * Middleware assumption:
 * Your auth middleware must set req.userId (string) for authenticated routes.
 * If you don't have that, this example will read userId from a header 'x-user-id' for demo.
 */

// Helper to get user id from req (adjust to your auth)
function getUserIdFromReq(req: any) {
  // try auth middleware
  if (req.userId) return req.userId;
  // fallback to header for quick testing
  if (req.headers && req.headers["x-user-id"]) return String(req.headers["x-user-id"]);
  return null;
}

/** Create memory */
router.post("/", async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "unauthenticated - set x-user-id header or integrate auth" });

    const { title, fullText } = req.body || {};
    if (!fullText) return res.status(400).json({ error: "fullText required" });

    // compute embedding
    const embedding = await createEmbedding(fullText);

    const memory = {
      id: crypto.randomUUID(),
      userId,
      title: title || "note",
      fullText,
      embedding,
      createdAt: new Date().toISOString(),
    };
    

    addMemory(memory);

    return res.json({ memory });
  } catch (err: any) {
    console.error("POST /memories error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

/** List user memories */
router.get("/", (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "unauthenticated - set x-user-id header or integrate auth" });
    const mems = getMemoriesByUser(userId);
    return res.json({ memories: mems });
  } catch (err: any) {
    console.error("GET /memories error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

export default router;
