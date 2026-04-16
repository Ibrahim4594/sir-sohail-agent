import { type EmbeddingModel, embedMany } from 'ai';
import { getEmbeddingModel } from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';
import { chunkPage } from './chunk';
import { parsePdf } from './parse-pdf';

const CHUNK_OPTS = { targetChars: 2000, overlapChars: 200 };

export type IngestInput = {
  filename: string;
  title?: string;
  storagePath: string;
  uploadedBy?: string;
  data: Uint8Array;
};

export type IngestResult = {
  documentId: string;
  chunkCount: number;
};

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const supabase = createServiceRoleSupabase();

  const { data: doc, error: insertErr } = await supabase
    .from('documents')
    .insert({
      filename: input.filename,
      title: input.title ?? input.filename,
      storage_path: input.storagePath,
      uploaded_by: input.uploadedBy ?? null,
      status: 'processing',
    })
    .select('id')
    .single();

  if (insertErr || !doc) throw new Error(`Failed to create document: ${insertErr?.message}`);

  try {
    const parsed = await parsePdf(input.data);

    type Staged = { page: number; index: number; content: string };
    const staged: Staged[] = [];
    for (let i = 0; i < parsed.pages.length; i++) {
      const pageText = parsed.pages[i];
      const chunks = chunkPage(pageText, CHUNK_OPTS);
      for (let idx = 0; idx < chunks.length; idx++) {
        staged.push({ page: i + 1, index: idx, content: chunks[idx] });
      }
    }

    if (staged.length === 0) throw new Error('No text extracted from PDF');

    const embeddingModel = getEmbeddingModel() as unknown as EmbeddingModel;
    const BATCH = 32;
    const embeddings: number[][] = [];
    for (let i = 0; i < staged.length; i += BATCH) {
      const slice = staged.slice(i, i + BATCH).map((s) => s.content);
      const { embeddings: batch } = await embedMany({ model: embeddingModel, values: slice });
      embeddings.push(...batch);
    }

    const rows = staged.map((s, i) => ({
      document_id: doc.id,
      page_number: s.page,
      chunk_index: s.index,
      content: s.content,
      embedding: embeddings[i] as unknown as string,
      token_count: Math.ceil(s.content.length / 4),
    }));

    const INSERT_BATCH = 100;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from('chunks').insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
    }

    await supabase
      .from('documents')
      .update({ page_count: parsed.pageCount, status: 'ready' })
      .eq('id', doc.id);

    return { documentId: doc.id, chunkCount: staged.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown ingest failure';
    await supabase
      .from('documents')
      .update({ status: 'failed', error_message: message })
      .eq('id', doc.id);
    throw e;
  }
}
