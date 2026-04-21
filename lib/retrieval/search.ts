import { embed } from 'ai';
import { env } from '@/lib/env';
import { getEmbeddingModel } from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

export type SearchResult = {
  chunkId: string;
  documentId: string;
  pageNumber: number;
  content: string;
  similarity: number;
  section: string;
  documentTitle: string;
  documentFilename: string;
};

export type SearchOpts = {
  topK?: number;
  similarityThreshold?: number;
};

export async function searchChunks(query: string, opts: SearchOpts = {}): Promise<SearchResult[]> {
  const e = env();
  const topK = opts.topK ?? e.RETRIEVAL_TOP_K;
  const threshold = opts.similarityThreshold ?? 0;

  const { embedding } = await embed({ model: getEmbeddingModel(), value: query });

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase.rpc('search_chunks', {
    // Supabase's generated types represent pgvector as string; the JS client
    // serializes number[] to the wire format automatically.
    query_embedding: embedding as unknown as string,
    match_count: topK,
    similarity_threshold: threshold,
  });
  if (error) throw new Error(`search_chunks RPC failed: ${error.message}`);

  return (data ?? []).map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    pageNumber: r.page_number,
    content: r.content,
    similarity: r.similarity,
    // `section` is populated by the 2026-04-22 migration. Older chunks
    // that predate the migration default to 'other' in the DB; the null
    // coalesce is defensive against the RPC ever omitting the column.
    section: (r as { section?: string | null }).section ?? 'other',
    documentTitle: r.document_title,
    documentFilename: r.document_filename,
  }));
}
