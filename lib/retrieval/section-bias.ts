import type { SearchResult } from './search';

/**
 * Section-aware re-ranking. Applied AFTER the similarity-threshold gate
 * and BEFORE the LLM-as-judge reranker. Adjusts each candidate's
 * effective score by a small, interpretable boost based on:
 *
 *   1. The SECTION the chunk was cut from — conclusions win ties, then
 *      purpose > problem > introduction > the rest.
 *   2. Whether the user's QUERY is itself asking about that type of
 *      section (e.g. "what did they conclude?" bumps conclusion chunks
 *      further).
 *
 * The whole step is monotone in original similarity — a chunk that
 * didn't clear the 0.4 gate can NEVER appear here, so we aren't
 * bypassing the grounding safeguards. We're just nudging the order
 * among chunks that already passed.
 */

export type Section =
  | 'abstract'
  | 'introduction'
  | 'problem'
  | 'purpose'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'implications'
  | 'references'
  | 'other';

export type QueryIntent = {
  conclusionish: boolean;
  purposeish: boolean;
  problemish: boolean;
  introish: boolean;
};

/**
 * Unconditional base boost per section. Tuned so a "neutral" query
 * (no intent signal) still prefers conclusion/purpose over methods by
 * a small but visible margin — enough to break ties, not enough to
 * vault a weakly-similar conclusion past a strongly-similar methods
 * chunk. References are actively penalised so bibliography junk can't
 * outrank real content even with a lucky cosine hit.
 */
const BASE_BOOST: Record<Section, number> = {
  conclusion: 0.08,
  purpose: 0.05,
  problem: 0.04,
  introduction: 0.03,
  abstract: 0.02,
  results: 0.01,
  discussion: 0.01,
  implications: 0.01,
  methods: 0,
  other: 0,
  references: -0.05,
};

// Applied on top of BASE_BOOST when the query's intent matches the
// chunk's section. A "findings" question gets conclusion/results/
// discussion an extra 0.10; purpose/problem/intro stay untouched.
const INTENT_MATCH_BONUS = 0.1;

/**
 * Lightweight keyword classifier for the query. Runs in microseconds,
 * no LLM call. False positives are acceptable — we only use this to
 * add a small bias — so we prefer recall over precision.
 */
export function detectQueryIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  // Conclusion / findings / takeaways vocabulary.
  const conclusionish =
    /\b(conclude|conclusion|conclusions|concluded|findings?|takeaway|takeaways|what did (?:they|the authors?) (?:find|conclude)|outcomes?|result\b|results\b|end up|bottom line|in summary)\b/i.test(
      q,
    );

  // Research purpose / aims / objectives / questions.
  const purposeish =
    /\b(purpose|aim|aims|goal|goals|objective|objectives|research question|research questions)\b/i.test(
      q,
    );

  // Problem statement / motivation / gap language.
  const problemish =
    /\b(problem|motivation|gap|issue|challenge|why (?:does|did) .+ matter)\b/i.test(q);

  // Introduction / background / context framing.
  const introish = /\b(introduce|introduction|background|context|framing|set up|setup)\b/i.test(q);

  return { conclusionish, purposeish, problemish, introish };
}

/**
 * Returns true when an intent-matched chunk should get the extra
 * INTENT_MATCH_BONUS on top of its base boost.
 */
function intentMatches(section: Section, intent: QueryIntent): boolean {
  if (
    intent.conclusionish &&
    (section === 'conclusion' || section === 'results' || section === 'discussion')
  ) {
    return true;
  }
  if (intent.purposeish && section === 'purpose') return true;
  if (intent.problemish && section === 'problem') return true;
  if (intent.introish && (section === 'introduction' || section === 'abstract')) return true;
  return false;
}

/**
 * Returns a new array sorted by adjusted score. Original array is not
 * mutated. `similarity` on the returned objects is left unchanged so
 * downstream citation verification can still reason about the raw
 * cosine score.
 */
export function applySectionBias(results: SearchResult[], intent: QueryIntent): SearchResult[] {
  const scored = results.map((r) => {
    const section = (r.section ?? 'other') as Section;
    const base = BASE_BOOST[section] ?? 0;
    const bonus = intentMatches(section, intent) ? INTENT_MATCH_BONUS : 0;
    // Cap at 1.0 — nothing scores above a perfect match.
    const adjusted = Math.min(1, r.similarity + base + bonus);
    return { result: r, adjusted };
  });

  scored.sort((a, b) => b.adjusted - a.adjusted);
  return scored.map((s) => s.result);
}
