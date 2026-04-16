import type { SearchResult } from '@/lib/retrieval/search';
import { extractCitationNumbers } from './extract';

export type VerifiedCitation = {
  marker: number;
  chunkId: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentFilename: string | null;
  pageNumber: number | null;
  snippet: string | null;
  valid: boolean;
};

export function verifyCitations(answer: string, sources: SearchResult[]): VerifiedCitation[] {
  const markers = extractCitationNumbers(answer);
  return markers.map((m) => {
    const src = sources[m - 1];
    if (!src) {
      return {
        marker: m,
        chunkId: null,
        documentId: null,
        documentTitle: null,
        documentFilename: null,
        pageNumber: null,
        snippet: null,
        valid: false,
      };
    }
    return {
      marker: m,
      chunkId: src.chunkId,
      documentId: src.documentId,
      documentTitle: src.documentTitle,
      documentFilename: src.documentFilename,
      pageNumber: src.pageNumber,
      snippet: src.content.slice(0, 300),
      valid: true,
    };
  });
}
