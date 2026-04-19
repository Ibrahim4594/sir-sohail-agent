import type { SearchResult } from './search';

export type GatedResult = {
  grounded: boolean;
  results: SearchResult[];
};

/**
 * Strict-grounding safeguard #2 — drop every chunk below the similarity
 * threshold. If nothing passes, `grounded` is false and the chat route
 * short-circuits with a soft refusal. Previously this only checked the
 * top-1 similarity and then passed the full list through, which leaked
 * weak chunks (e.g. cosine 0.15) into the LLM context whenever the top
 * chunk happened to clear the bar. Filtering per-chunk means the LLM
 * only ever sees context above the confidence floor.
 */
export function applyThreshold(results: SearchResult[], threshold: number): GatedResult {
  const passed = results.filter((r) => r.similarity >= threshold);
  return { grounded: passed.length > 0, results: passed };
}
