import { describe, expect, it } from 'vitest';
import type { SearchResult } from './search';
import { applyThreshold } from './threshold';

const r = (similarity: number): SearchResult => ({
  chunkId: 'x',
  documentId: 'd',
  pageNumber: 1,
  content: 'c',
  similarity,
  documentTitle: 't',
  documentFilename: 'f.pdf',
});

describe('applyThreshold', () => {
  it('returns all results if best score clears threshold', () => {
    const out = applyThreshold([r(0.8), r(0.7), r(0.2)], 0.4);
    expect(out.grounded).toBe(true);
    expect(out.results).toHaveLength(3);
  });

  it('returns empty + ungrounded when all results below threshold', () => {
    const out = applyThreshold([r(0.3), r(0.2)], 0.4);
    expect(out.grounded).toBe(false);
    expect(out.results).toEqual([]);
  });

  it('handles empty input', () => {
    expect(applyThreshold([], 0.4)).toEqual({ grounded: false, results: [] });
  });
});
