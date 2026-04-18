import { generateText } from 'ai';
import { getChatModel } from '@/lib/llm/model';
import type { SearchResult } from '@/lib/retrieval/search';
import type { VerifiedCitation } from './verify';

/**
 * Post-generation entailment check — the final strict-grounding layer.
 *
 * `verifyCitations` already confirms each [N] marker points to a real
 * retrieved chunk. But "real chunk" ≠ "chunk actually supports the
 * claim": the LLM can cite [3] while the claim is drifting from what
 * chunk 3 actually says ("illusion of groundedness"). This module asks
 * gemma, for each claim-citation pair, whether the chunk genuinely
 * supports the claim. If not, the citation is flipped to valid:false
 * so the UI flags it instead of presenting a fake citation as verified.
 *
 * We batch all pairs into a single LLM call (one line per pair) so the
 * cost is one extra round-trip per answer, not N.
 */

const MAX_CLAIM_CHARS = 280;
const MAX_CHUNK_CHARS = 700;

/**
 * Extracts the sentence containing each [N] marker. That sentence is
 * the "claim" we test for entailment — checking the whole answer against
 * every chunk would be too broad; checking just the sentence around the
 * marker matches what the user sees next to the footnote.
 */
function findClaimFor(answer: string, marker: number): string | null {
  const needle = `[${marker}]`;
  const idx = answer.indexOf(needle);
  if (idx < 0) return null;

  // Walk back to the previous sentence boundary, forward to the next.
  const before = answer.slice(0, idx);
  const after = answer.slice(idx + needle.length);
  const startMatch = before.match(/(?:^|[.!?\n])([^.!?\n]*)$/);
  const endMatch = after.match(/^[^.!?\n]*/);
  const start = startMatch ? startMatch[1] : '';
  const end = endMatch ? endMatch[0] : '';
  const claim = `${start.trim()}${needle}${end.trim()}`.replace(/\s+/g, ' ').trim();
  if (!claim) return null;
  return claim.length > MAX_CLAIM_CHARS ? `${claim.slice(0, MAX_CLAIM_CHARS)}…` : claim;
}

function trimChunk(content: string): string {
  const s = content.replace(/\s+/g, ' ').trim();
  return s.length > MAX_CHUNK_CHARS ? `${s.slice(0, MAX_CHUNK_CHARS)}…` : s;
}

/**
 * Parses judgements like "1: YES", "2: NO", "#3 -> yes". Returns map of
 * pair index → true (supported) / false (not supported).
 */
function parseJudgements(output: string, count: number): Map<number, boolean> {
  const out = new Map<number, boolean>();
  for (const raw of output.split('\n')) {
    const m = raw.trim().match(/(?:^|\b)(?:#?\s*)(\d+)\s*[:.\-=)>]\s*(yes|y|no|n|true|false)\b/i);
    if (!m) continue;
    const idx = Number.parseInt(m[1], 10);
    if (!Number.isFinite(idx) || idx < 1 || idx > count) continue;
    const verdict = /^y|^t/i.test(m[2]);
    out.set(idx, verdict);
  }
  return out;
}

export async function checkEntailment(
  answer: string,
  citations: VerifiedCitation[],
  sources: SearchResult[],
): Promise<VerifiedCitation[]> {
  // Only check citations that verifyCitations already marked valid —
  // invalid markers stay invalid; we're sharpening a "passes first
  // gate" set, not resurrecting phantom ones.
  const checkable = citations
    .map((c, originalIdx) => ({ c, originalIdx }))
    .filter(({ c }) => c.valid);
  if (checkable.length === 0) return citations;

  const pairs: { pairIdx: number; originalIdx: number; claim: string; chunk: string }[] = [];
  for (const { c, originalIdx } of checkable) {
    const claim = findClaimFor(answer, c.marker);
    const src = sources[c.marker - 1];
    if (!claim || !src) continue;
    pairs.push({
      pairIdx: pairs.length + 1,
      originalIdx,
      claim,
      chunk: trimChunk(src.content),
    });
  }
  if (pairs.length === 0) return citations;

  const body = pairs
    .map((p) => `[${p.pairIdx}]\nCLAIM: ${p.claim}\nSOURCE: ${p.chunk}`)
    .join('\n\n');

  const prompt = `You are a strict entailment judge for a research assistant.

For each numbered pair below, decide whether the SOURCE text directly supports the CLAIM. "Support" means the source contains the specific information being claimed — not just the general topic.

- Answer YES only if a reader could reasonably cite that source for that claim.
- Answer NO if the source is merely on-topic, tangential, or partially overlapping.
- Ignore the "[N]" citation marker inside the claim — it is just a bracket.

Pairs:
${body}

Respond with exactly ${pairs.length} lines, each formatted as "N: YES" or "N: NO", in order. No commentary.`;

  let judgements: Map<number, boolean>;
  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt,
      // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
      ...({ maxOutputTokens: 8 * pairs.length } as any),
    });
    judgements = parseJudgements(text, pairs.length);
  } catch (err) {
    // On any failure, leave citations as-is — we don't want a
    // reranker/entailer hiccup to downgrade valid citations. But
    // DO log it so a persistent failure of safeguard #3 is visible
    // in Vercel logs; a silent hole would be worse than a noisy one.
    console.error('[entailment] check skipped due to LLM error; citations returned unchanged', err);
    return citations;
  }

  if (judgements.size === 0) return citations;

  const next = citations.map((c) => ({ ...c }));
  for (const p of pairs) {
    const verdict = judgements.get(p.pairIdx);
    if (verdict === false) {
      next[p.originalIdx] = { ...next[p.originalIdx], valid: false };
    }
  }
  return next;
}
