import { describe, expect, it } from 'vitest';
import type { SearchResult } from './search';
import { applySectionBias, detectQueryIntent } from './section-bias';

function makeResult(
  partial: Partial<SearchResult> & { similarity: number; section: string },
): SearchResult {
  return {
    chunkId: partial.chunkId ?? crypto.randomUUID(),
    documentId: partial.documentId ?? crypto.randomUUID(),
    pageNumber: partial.pageNumber ?? 1,
    content: partial.content ?? 'lorem ipsum',
    similarity: partial.similarity,
    section: partial.section,
    documentTitle: partial.documentTitle ?? 'Test Doc',
    documentFilename: partial.documentFilename ?? 'test.pdf',
  };
}

describe('detectQueryIntent', () => {
  it('flags conclusion language', () => {
    const i = detectQueryIntent('what did the paper conclude about PBL?');
    expect(i.conclusionish).toBe(true);
  });

  it('flags purpose language', () => {
    const i = detectQueryIntent('what is the research objective of this study?');
    expect(i.purposeish).toBe(true);
  });

  it('flags problem language', () => {
    const i = detectQueryIntent('what problem motivates the design thinking paper?');
    expect(i.problemish).toBe(true);
  });

  it('flags intro/background language', () => {
    const i = detectQueryIntent('how do the authors introduce the background?');
    expect(i.introish).toBe(true);
  });

  it('returns all false for a neutral query', () => {
    const i = detectQueryIntent('compare pedagogy in medical schools');
    expect(i.conclusionish).toBe(false);
    expect(i.purposeish).toBe(false);
    expect(i.problemish).toBe(false);
    expect(i.introish).toBe(false);
  });
});

describe('applySectionBias', () => {
  it('a conclusion chunk at 0.55 beats a methods chunk at 0.60 for a findings question', () => {
    const results = [
      makeResult({ similarity: 0.6, section: 'methods', content: 'methods body' }),
      makeResult({ similarity: 0.55, section: 'conclusion', content: 'conclusion body' }),
    ];
    const intent = detectQueryIntent('what did they conclude?');
    const biased = applySectionBias(results, intent);
    expect(biased[0].section).toBe('conclusion');
    // adjusted(conclusion) = 0.55 + 0.08 + 0.10 = 0.73
    // adjusted(methods)    = 0.60 + 0     + 0   = 0.60
  });

  it('barely perturbs ordering on a neutral query (only base boost applies)', () => {
    const results = [
      makeResult({ similarity: 0.7, section: 'methods' }),
      makeResult({ similarity: 0.68, section: 'conclusion' }),
    ];
    const intent = detectQueryIntent('compare PBL and design thinking');
    const biased = applySectionBias(results, intent);
    // methods: 0.70 + 0    = 0.70
    // concl:   0.68 + 0.08 = 0.76 → conclusion still wins under base boost
    expect(biased[0].section).toBe('conclusion');
  });

  it('base boost alone is not strong enough to leapfrog a big similarity gap', () => {
    const results = [
      makeResult({ similarity: 0.85, section: 'methods' }),
      makeResult({ similarity: 0.5, section: 'conclusion' }),
    ];
    const intent = detectQueryIntent('compare PBL and design thinking');
    const biased = applySectionBias(results, intent);
    // methods: 0.85 + 0    = 0.85
    // concl:   0.50 + 0.08 = 0.58 → methods wins; the bias is a nudge,
    // not a bypass.
    expect(biased[0].section).toBe('methods');
  });

  it('penalises references sections so bibliography hits sink', () => {
    const results = [
      makeResult({ similarity: 0.65, section: 'references' }),
      makeResult({ similarity: 0.6, section: 'introduction' }),
    ];
    const biased = applySectionBias(results, detectQueryIntent('what is innovation education?'));
    // references: 0.65 + (-0.05) = 0.60
    // intro:      0.60 + 0.03    = 0.63 → intro wins
    expect(biased[0].section).toBe('introduction');
  });

  it('leaves the original array untouched', () => {
    const results = [
      makeResult({ similarity: 0.5, section: 'methods' }),
      makeResult({ similarity: 0.7, section: 'conclusion' }),
    ];
    const original = [...results];
    applySectionBias(results, detectQueryIntent('findings'));
    expect(results).toEqual(original);
  });

  it('treats missing section as "other" (zero boost)', () => {
    const results = [
      // @ts-expect-error intentionally exercise the fallback
      makeResult({ similarity: 0.7, section: undefined }),
    ];
    const biased = applySectionBias(results, detectQueryIntent('findings'));
    expect(biased).toHaveLength(1);
  });
});
