export type UIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: {
    marker: number;
    chunkId: string | null;
    documentId: string | null;
    documentTitle: string | null;
    documentFilename: string | null;
    pageNumber: number | null;
    snippet: string | null;
    valid: boolean;
  }[];
};
