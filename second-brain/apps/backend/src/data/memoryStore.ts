// apps/backend/src/data/memoryStore.ts
/**
 * Simple in-memory memory store for demo.
 * Each memory stores id, userId, title, fullText, embedding, createdAt.
 *
 * For a production system switch to a DB (Postgres + pgvector, Pinecone, Supabase, etc.)
 */

export interface Memory {
  id: string;
  userId: string;
  title: string;
  fullText: string;
  embedding: number[]; // numeric vector
  createdAt: string;
}

const memories: Memory[] = [];

/** Add a memory to the store */
export function addMemory(m: Memory) {
  memories.push(m);
}

/** Get all memories for a user (most-recent first) */
export function getMemoriesByUser(userId: string): Memory[] {
  return memories
    .filter((m) => m.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Cosine similarity (assumes vectors same length) */
function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Find top-k similar memories for a user given a query embedding */
export function findSimilarMemories(userId: string, queryEmbedding: number[], limit = 5) {
  const userMemories = memories.filter((m) => m.userId === userId && m.embedding && m.embedding.length === queryEmbedding.length);

  const scored = userMemories.map((m) => ({
    memoryId: m.id,
    score: cosineSimilarity(queryEmbedding, m.embedding),
    text: m.fullText,
    title: m.title,
    createdAt: m.createdAt,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
