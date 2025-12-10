// apps/backend/src/routes/chat.ts
import express from "express";
const router = express.Router();

/* helpers */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function tokenize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
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
  "where","why","how","all","any","some","one","two","three","i'm","you're"
]);

function meaningfulTokens(text: string) {
  const toks = tokenize(text).filter(t => !STOP.has(t) && t.length > 1);
  return Array.from(new Set(toks));
}

function jaccard(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = Array.from(sa).filter(x => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  if (uni === 0) return 0;
  return inter / uni;
}

/* route */
router.post("/", (req, res) => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    const raw = String(req.body?.message || "").trim();

    if (!raw) return res.status(400).json({ error: "message required" });

    // quick guard: ignore trivially short queries (single chars)
    if (raw.length <= 1) return res.json({ reply: `No memories found for "${raw}" (too short)`, used: [] });

    const qToks = meaningfulTokens(raw);
    if (qToks.length === 0) {
      // maybe the user typed stopwords only
      return res.json({ reply: `No memories found for "${raw}" (no meaningful tokens)`, used: [] });
    }

    // Load user's memories - adjust this if you use a DB
    // @ts-ignore
    const store = (globalThis as any).memories || {};
    const userMems = Array.isArray(store[userId]) ? store[userId] : [];

    if (userMems.length === 0) {
      return res.json({ reply: `No memories found for "${raw}"`, used: [] });
    }

    // Score each memory and check whole-word occurrence
    const scored = userMems.map(m => {
      const memText = String(`${m.title || ""} ${m.fullText || ""}`).trim();
      const memToks = meaningfulTokens(memText);
      const matches = memToks.filter(t => qToks.includes(t)).length;
      const matchRatio = qToks.length ? matches / qToks.length : 0;
      const jac = jaccard(qToks, memToks);

      // whole-word check: ANY meaningful query token appears as a whole word in memText
      let wholeWordMatches = 0;
      for (const qt of qToks) {
        const re = new RegExp(`\\b${escapeRegExp(qt)}\\b`, "i");
        if (re.test(memText)) wholeWordMatches++;
      }

      // For debugging readability, include snippet
      const snippet = memText.length > 200 ? memText.slice(0, 200) + "…" : memText;
      return { mem: m, memText, memToks, matches, matchRatio, jac, wholeWordMatches, snippet };
    });

    console.log(`[CHAT] query="${raw}" qToks=${JSON.stringify(qToks)} scanned=${scored.length}`);

    // strict selection:
    // prefer memories with whole-word match (safer)
    // fallback to ratio/jaccard with higher thresholds
    const MIN_WHOLEWORD = 1;      // at least one whole-word token match
    const MIN_MATCHES = 1;        // at least this many query tokens matched
    const MIN_SCORE = 0.35;       // score threshold (jaccard or ratio-based)
    const matched = scored.filter(s =>
      (s.wholeWordMatches >= MIN_WHOLEWORD && s.matches >= MIN_MATCHES) ||
      (s.matches >= MIN_MATCHES && Math.max(s.jac, s.matchRatio) >= MIN_SCORE)
    ).sort((a,b) => {
      // order by: wholeWordMatches desc, then score desc
      const sa = (a.wholeWordMatches>0 ? 100 : 0) + Math.max(a.jac, a.matchRatio);
      const sb = (b.wholeWordMatches>0 ? 100 : 0) + Math.max(b.jac, b.matchRatio);
      return sb - sa;
    });

    console.log(`[CHAT] matchedCount=${matched.length} sample=${matched.slice(0,5).map(x => ({ id: x.mem.id, whole: x.wholeWordMatches, matches: x.matches, score: Number(Math.max(x.jac,x.matchRatio).toFixed(4)) }))}`);

    if (matched.length === 0) {
      return res.json({ reply: `No memories found for "${raw}"`, used: [] });
    }

    // build used array with top results (dedupe by id)
    const used = [];
    const seen = new Set<string>();
    for (const s of matched) {
      const id = s.mem?.id || "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      used.push({
        memoryId: id,
        title: s.mem.title,
        snippet: s.snippet,
        score: Number(Math.max(s.jac, s.matchRatio).toFixed(4)),
        wholeWordMatches: s.wholeWordMatches,
        matches: s.matches
      });
      if (used.length >= 10) break;
    }

    return res.json({ reply: `I found ${used.length} memory(ies) related to \"${raw}\"`, used });
  } catch (err) {
    console.error("chat handler error", err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
