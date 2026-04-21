import type { SearchResult } from '@/lib/retrieval/search';

export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export type BuildPromptInput = {
  chunks: SearchResult[];
  history: HistoryMessage[];
  question: string;
};

export function buildPrompt(input: BuildPromptInput): string {
  const contextBlocks = input.chunks
    .map(
      (c, i) =>
        `[${i + 1}] (Title: ${c.documentTitle}, Section: ${c.section}, Page: ${c.pageNumber})\n${c.content.trim()}`,
    )
    .join('\n\n');

  const historyBlock = input.history.map((h) => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

  return [
    'CONTEXT:',
    contextBlocks || '(no relevant context)',
    '',
    'CONVERSATION HISTORY:',
    historyBlock || '(empty)',
    '',
    `USER QUESTION: ${input.question}`,
  ].join('\n');
}

export function buildTopicsList(chunks: SearchResult[]): string[] {
  const byTitle = new Map<string, string>();
  for (const c of chunks) {
    if (!byTitle.has(c.documentTitle)) byTitle.set(c.documentTitle, c.content.slice(0, 100));
  }
  return Array.from(byTitle.keys()).slice(0, 5);
}
