import { describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '@/lib/retrieval/search';
import type { VerifiedCitation } from './verify';

const generateTextMock = vi.fn();
vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));
vi.mock('@/lib/llm/model', () => ({
  getChatModel: () => ({ modelId: 'stub-pro' }),
  getHelperModel: () => ({ modelId: 'stub-flash' }),
}));

const { checkEntailment } = await import('./entailment');

const src = (id: string, content: string): SearchResult => ({
  chunkId: id,
  documentId: `doc-${id}`,
  pageNumber: 1,
  content,
  similarity: 0.8,
  documentTitle: `Paper ${id}`,
  documentFilename: `${id}.pdf`,
  section: 'other',
});

const cite = (marker: number, valid: boolean): VerifiedCitation => ({
  marker,
  chunkId: `c${marker}`,
  documentId: `d${marker}`,
  documentTitle: `Paper ${marker}`,
  documentFilename: `${marker}.pdf`,
  pageNumber: 1,
  snippet: 'snippet',
  valid,
});

describe('checkEntailment', () => {
  it('no-ops when there are no valid citations', async () => {
    const out = await checkEntailment('', [cite(1, false)], []);
    expect(out).toEqual([cite(1, false)]);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('flips unsupported claims to valid:false, leaves supported ones alone', async () => {
    generateTextMock.mockResolvedValueOnce({ text: '1: YES\n2: NO' });
    const answer = 'Design thinking is collaborative [1]. It also cures cancer [2].';
    const sources = [
      src('1', 'Design thinking is described as a highly collaborative process'),
      src('2', 'Some paper about entrepreneurship education'),
    ];
    const citations = [cite(1, true), cite(2, true)];

    const out = await checkEntailment(answer, citations, sources);
    expect(out[0].valid).toBe(true);
    expect(out[1].valid).toBe(false);
  });

  it('leaves citations unchanged if parse fails', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'I am unable to judge this.' });
    const answer = 'Claim [1].';
    const sources = [src('1', 'source text')];
    const citations = [cite(1, true)];

    const out = await checkEntailment(answer, citations, sources);
    expect(out).toEqual(citations);
  });

  it('leaves citations unchanged if the LLM call throws', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('boom'));
    const answer = 'Claim [1].';
    const sources = [src('1', 'source')];
    const citations = [cite(1, true)];

    const out = await checkEntailment(answer, citations, sources);
    expect(out).toEqual(citations);
  });

  it('never resurrects citations that were already invalid', async () => {
    generateTextMock.mockResolvedValueOnce({ text: '1: YES' });
    const answer = 'Claim one [1]. Claim two [2].';
    const sources = [src('1', 'supports claim one'), src('2', 'supports claim two')];
    const citations = [cite(1, true), cite(2, false)];

    const out = await checkEntailment(answer, citations, sources);
    expect(out[0].valid).toBe(true);
    expect(out[1].valid).toBe(false);
  });
});
