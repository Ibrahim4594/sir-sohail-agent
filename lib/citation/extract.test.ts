import { describe, expect, it } from 'vitest';
import { extractCitationNumbers } from './extract';

describe('extractCitationNumbers', () => {
  it('finds single markers', () => {
    expect(extractCitationNumbers('Foo [1] bar.')).toEqual([1]);
  });
  it('finds multiple markers and deduplicates', () => {
    expect(extractCitationNumbers('A[1][2] B[1] C[3].')).toEqual([1, 2, 3]);
  });
  it('ignores non-citation brackets', () => {
    expect(extractCitationNumbers('Array[0] should be ignored. But [4] counts.')).toEqual([4]);
  });
  it('handles empty text', () => {
    expect(extractCitationNumbers('')).toEqual([]);
  });
});
