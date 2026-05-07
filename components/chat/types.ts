export type Citation = {
  marker: number;
  chunkId: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentFilename: string | null;
  pageNumber: number | null;
  snippet: string | null;
  valid: boolean;
};

export type UIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  followups?: string[];
  streaming?: boolean;
  error?: string | null;
};

export type StreamEvent =
  | { type: 'ack' }
  | { type: 'text'; value: string }
  | { type: 'meta'; conversationId: string; citations: Citation[]; followups: string[] }
  | { type: 'error'; message: string };
