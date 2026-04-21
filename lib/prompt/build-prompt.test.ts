import { describe, expect, it } from 'vitest';
import type { SearchResult } from '@/lib/retrieval/search';
import { buildPrompt } from './build-prompt';

const mkResult = (n: number): SearchResult => ({
  chunkId: `c-${n}`,
  documentId: `d-${n}`,
  pageNumber: n,
  content: `Content ${n}.`,
  similarity: 0.9 - n * 0.01,
  documentTitle: `Title ${n}`,
  documentFilename: `file${n}.pdf`,
  section: 'other',
});

describe('buildPrompt', () => {
  it('includes each retrieved chunk with a numbered source header', () => {
    const out = buildPrompt({
      chunks: [mkResult(1), mkResult(2)],
      history: [],
      question: 'What does the literature say?',
    });
    expect(out).toContain('[1] (Title: Title 1, Section: other, Page: 1)');
    expect(out).toContain('Content 1.');
    expect(out).toContain('[2] (Title: Title 2, Section: other, Page: 2)');
    expect(out).toContain('USER QUESTION: What does the literature say?');
  });

  it('formats conversation history in order', () => {
    const out = buildPrompt({
      chunks: [mkResult(1)],
      history: [
        { role: 'user', content: 'q1' },
        { role: 'assistant', content: 'a1' },
      ],
      question: 'q2',
    });
    expect(out.indexOf('q1')).toBeLessThan(out.indexOf('a1'));
    expect(out.indexOf('a1')).toBeLessThan(out.indexOf('USER QUESTION: q2'));
  });
});
