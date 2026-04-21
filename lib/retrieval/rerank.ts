import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/model';
import type { SearchResult } from './search';

/**
 * LLM-as-judge reranker. Retrieval by cosine similarity alone is lossy
 * — two chunks can look equally close in embedding space yet differ
 * sharply in how well they actually answer the question. We fix that by
 * asking the LLM we already have (gemma4:e4b) to score each candidate's
 * relevance in a single batched call, then re-sort by that score.
 *
 * Flow on a research question:
 *   pgvector returns top-N candidates (N = RETRIEVAL_CANDIDATE_K, ~20)
 *     → this reranker scores them 0-10
 *     → we keep the top-K highest scorers (K = RETRIEVAL_TOP_K, ~8)
 *     → those go to the answer LLM
 *
 * This costs one extra LLM round-trip (~1-2s on local gemma) but
 * measurably improves citation precision — the answer LLM stops seeing
 * chunks that merely share keywords with the question.
 */
const MAX_SNIPPET_CHARS = 700;

function snippet(content: string): string {
  const s = content.replace(/\s+/g, ' ').trim();
  return s.length > MAX_SNIPPET_CHARS ? `${s.slice(0, MAX_SNIPPET_CHARS)}…` : s;
}

/**
 * Parses lines like "3: 8" / "3. 8" / "#3 -> 8" / "3=8" into a map of
 * passage index → score. Gemma's output format isn't always tight, so
 * we accept several separators and ignore anything that doesn't match.
 */
function parseScores(output: string, count: number): Map<number, number> {
  const scores = new Map<number, number>();
  for (const raw of output.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/(?:^|\b)(?:#?\s*)(\d+)\s*[:.\-=)>]\s*(-?\d+(?:\.\d+)?)/);
    if (!m) continue;
    const idx = Number.parseInt(m[1], 10);
    const score = Number.parseFloat(m[2]);
    if (!Number.isFinite(idx) || !Number.isFinite(score)) continue;
    if (idx < 1 || idx > count) continue;
    scores.set(idx, Math.max(0, Math.min(10, score)));
  }
  return scores;
}

export async function rerankChunks(
  query: string,
  candidates: SearchResult[],
  opts: { topK: number },
): Promise<SearchResult[]> {
  if (candidates.length <= opts.topK) return candidates;

  const passages = candidates
    .map(
      (c, i) =>
        `[${i + 1}] (${c.documentTitle}, Section: ${c.section}, p.${c.pageNumber})\n${snippet(c.content)}`,
    )
    .join('\n\n');

  const prompt = `You are a relevance grader for a research assistant.

Question: ${query}

Rate each passage below on how directly it would help answer the question. Use an integer 0–10:
- 0: off-topic / unrelated
- 5: touches on the topic but doesn't answer
- 8: directly relevant, contains answerable material
- 10: directly and specifically answers the question

PREFER passages whose SECTION directly matches the question's intent — conclusion/results/discussion for "what did they find / conclude"; purpose for research questions and aims; problem for motivation; introduction/abstract for background framing. Methods and references should only score high when the question is specifically about methodology or citation practice.

Passages:
${passages}

Respond with exactly ${candidates.length} lines, each formatted as "N: SCORE" (one line per passage, in order). No commentary.`;

  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt,
      // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
      ...({ maxOutputTokens: 16 * candidates.length } as any),
    });

    const scores = parseScores(text, candidates.length);
    if (scores.size === 0) {
      // Model returned nothing parseable — fall back to cosine order.
      return candidates.slice(0, opts.topK);
    }

    const ranked = candidates
      .map((c, i) => ({
        c,
        score: scores.get(i + 1) ?? -1,
        fallback: c.similarity,
      }))
      .sort((a, b) => (b.score === a.score ? b.fallback - a.fallback : b.score - a.score))
      .map((x) => x.c);

    return ranked.slice(0, opts.topK);
  } catch {
    // Any failure in the reranker falls back to the original cosine order.
    return candidates.slice(0, opts.topK);
  }
}
