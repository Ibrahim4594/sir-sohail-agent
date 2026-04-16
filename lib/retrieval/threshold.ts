import type { SearchResult } from './search';

export type GatedResult = {
  grounded: boolean;
  results: SearchResult[];
};

export function applyThreshold(results: SearchResult[], threshold: number): GatedResult {
  if (results.length === 0) return { grounded: false, results: [] };
  const top = results[0];
  if (top.similarity < threshold) return { grounded: false, results: [] };
  return { grounded: true, results };
}
