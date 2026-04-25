import { describe, expect, it, vi } from 'vitest';
import type { SearchResult } from './search';

// Stub the LLM module so rerankChunks runs offline in unit tests.
const generateTextMock = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));
vi.mock('@/lib/llm/model', () => ({
  getChatModel: () => ({ modelId: 'stub-pro' }),
  getHelperModel: () => ({ modelId: 'stub-flash' }),
}));

const { rerankChunks } = await import('./rerank');

const r = (id: string, similarity: number, content: string): SearchResult => ({
  chunkId: id,
  documentId: `doc-${id}`,
  pageNumber: 1,
  content,
  similarity,
  documentTitle: `Paper ${id}`,
  documentFilename: `${id}.pdf`,
  section: 'other',
});

describe('rerankChunks', () => {
  it('passes through when candidate count <= topK', async () => {
    const candidates = [r('a', 0.8, 'foo'), r('b', 0.7, 'bar')];
    const out = await rerankChunks('q', candidates, { topK: 8 });
    expect(out).toEqual(candidates);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('reorders based on parsed LLM scores and trims to topK', async () => {
    generateTextMock.mockResolvedValueOnce({
      text: '1: 2\n2: 9\n3: 5',
    });
    const candidates = [
      r('low', 0.95, 'irrelevant but high cosine'),
      r('high', 0.55, 'directly answers the question'),
      r('mid', 0.7, 'tangentially related'),
    ];
    const out = await rerankChunks('q', candidates, { topK: 2 });
    expect(out.map((c) => c.chunkId)).toEqual(['high', 'mid']);
  });

  it('breaks ties on reranker score using original cosine order', async () => {
    generateTextMock.mockResolvedValueOnce({
      text: '1: 7\n2: 7\n3: 7',
    });
    const candidates = [r('a', 0.6, 'one'), r('b', 0.9, 'two'), r('c', 0.75, 'three')];
    const out = await rerankChunks('q', candidates, { topK: 2 });
    expect(out.map((c) => c.chunkId)).toEqual(['b', 'c']);
  });

  it('falls back to cosine order when LLM output is unparseable', async () => {
    generateTextMock.mockResolvedValueOnce({
      text: 'I cannot help with this task',
    });
    const candidates = [r('a', 0.9, 'one'), r('b', 0.8, 'two'), r('c', 0.7, 'three')];
    const out = await rerankChunks('q', candidates, { topK: 2 });
    expect(out.map((c) => c.chunkId)).toEqual(['a', 'b']);
  });

  it('falls back to cosine order when the LLM throws', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('boom'));
    const candidates = [r('a', 0.9, 'one'), r('b', 0.8, 'two'), r('c', 0.7, 'three')];
    const out = await rerankChunks('q', candidates, { topK: 2 });
    expect(out.map((c) => c.chunkId)).toEqual(['a', 'b']);
  });
});
