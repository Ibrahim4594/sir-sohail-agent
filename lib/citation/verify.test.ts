import { describe, expect, it } from 'vitest';
import type { SearchResult } from '@/lib/retrieval/search';
import { verifyCitations } from './verify';

const mk = (n: number): SearchResult => ({
  chunkId: `c-${n}`,
  documentId: `d-${n}`,
  pageNumber: n,
  content: `Chunk ${n} content.`,
  similarity: 0.9,
  documentTitle: `Doc ${n}`,
  documentFilename: `f${n}.pdf`,
});

describe('verifyCitations', () => {
  it('returns one citation per extracted marker, mapped to source', () => {
    const sources = [mk(1), mk(2), mk(3)];
    const answer = 'First fact [1]. Second [2].';
    const out = verifyCitations(answer, sources);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      marker: 1,
      chunkId: 'c-1',
      pageNumber: 1,
      valid: true,
    });
    expect(out[1].marker).toBe(2);
  });

  it('marks a citation invalid if the marker number has no source', () => {
    const sources = [mk(1)];
    const answer = 'Real [1]. Made up [5].';
    const out = verifyCitations(answer, sources);
    expect(out).toHaveLength(2);
    expect(out.find((c) => c.marker === 5)?.valid).toBe(false);
  });

  it('returns empty when answer has no citations', () => {
    expect(verifyCitations('No citations here.', [mk(1)])).toEqual([]);
  });
});
