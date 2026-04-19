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
  it('drops chunks below threshold even when top-1 clears it', () => {
    const out = applyThreshold([r(0.8), r(0.7), r(0.2)], 0.4);
    expect(out.grounded).toBe(true);
    expect(out.results.map((x) => x.similarity)).toEqual([0.8, 0.7]);
  });

  it('returns every chunk when every chunk clears the threshold', () => {
    const out = applyThreshold([r(0.9), r(0.6), r(0.5)], 0.4);
    expect(out.grounded).toBe(true);
    expect(out.results).toHaveLength(3);
  });

  it('returns empty + ungrounded when all results below threshold', () => {
    const out = applyThreshold([r(0.3), r(0.2)], 0.4);
    expect(out.grounded).toBe(false);
    expect(out.results).toEqual([]);
  });

  it('treats chunks exactly at the threshold as passing', () => {
    const out = applyThreshold([r(0.4), r(0.39)], 0.4);
    expect(out.grounded).toBe(true);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].similarity).toBe(0.4);
  });

  it('handles empty input', () => {
    expect(applyThreshold([], 0.4)).toEqual({ grounded: false, results: [] });
  });
});
