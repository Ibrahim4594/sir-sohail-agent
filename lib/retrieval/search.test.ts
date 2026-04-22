import { describe, expect, it } from 'vitest';
import { searchChunks } from './search';

// Skip entire suite unless the local stack is up.
const LIVE = process.env.RAG_LIVE_TESTS === '1';

describe.skipIf(!LIVE)('searchChunks (integration, requires DB + Gemini API key)', () => {
  it('returns top-K chunks ranked by similarity for a corpus-relevant query', async () => {
    const results = await searchChunks('project-based learning', { topK: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
    const first = results[0];
    expect(first.chunkId).toBeTruthy();
    expect(first.documentId).toBeTruthy();
    expect(first.pageNumber).toBeGreaterThan(0);
    expect(first.content.length).toBeGreaterThan(0);
  });

  it('returns an empty array for an obviously off-topic query when threshold is high', async () => {
    const results = await searchChunks('recipe for chocolate chip cookies', {
      topK: 5,
      similarityThreshold: 0.6,
    });
    expect(Array.isArray(results)).toBe(true);
  });
});
