// apps/backend/src/utils/embeddings.ts
/**
 * Embeddings util using @xenova/transformers (JS-only sentence-transformer).
 * createEmbedding(text) -> number[] (L2-normalized embedding)
 *
 * If the model fails to load, the functions will still exist and throw an informative error.
 */

import { pipeline } from "@xenova/transformers";

let embedder: any = null;

/** Initialize and cache the embedding pipeline */
async function getEmbedder() {
  if (embedder) return embedder;
  try {
    // Model: "Xenova/all-MiniLM-L6-v2" is a compact, widely used model.
    // This will download model files on first run (cached).
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    return embedder;
  } catch (err) {
    console.error("Failed to initialize embedding pipeline:", err);
    throw new Error("Embedding model load failed. Ensure @xenova/transformers is installed and network access is available.");
  }
}

/** Create embedding vector for a string. Returns a JS number[] */
export async function createEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  // pooling: "mean" aggregates token vectors, normalize true to get unit vector
  const out = await pipe(text, { pooling: "mean", normalize: true });
  // output shape: { data: Float32Array([...]) } in xenova
  if (!out || !out.data) throw new Error("Unexpected embedder output");
  const arr = Array.from(out.data as Iterable<number>);
  return arr;
}
