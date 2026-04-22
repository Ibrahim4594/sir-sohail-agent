import { embedMany } from 'ai';
import { EMBEDDING_PROVIDER_OPTIONS, getEmbeddingModel } from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';
import { chunkPage } from './chunk';
import { parsePdf } from './parse-pdf';
import { type Section, segmentPagesBySection } from './sections';

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

    // Tag each chunk with its IMRaD section so section-aware retrieval
    // can boost conclusion / purpose / problem / introduction passages
    // at query time. See lib/ingest/sections.ts for detector details.
    const spans = segmentPagesBySection(parsed.pages);

    type Staged = { page: number; index: number; content: string; section: Section };
    const staged: Staged[] = [];
    // chunk_index has a unique constraint on (document_id, page_number,
    // chunk_index); track a per-page counter so multiple sections on
    // the same page don't collide.
    const indexPerPage = new Map<number, number>();
    for (const span of spans) {
      const chunks = chunkPage(span.text, CHUNK_OPTS);
      for (const chunk of chunks) {
        const idx = indexPerPage.get(span.page) ?? 0;
        staged.push({ page: span.page, index: idx, content: chunk, section: span.section });
        indexPerPage.set(span.page, idx + 1);
      }
    }

    if (staged.length === 0) throw new Error('No text extracted from PDF');

    const embeddingModel = getEmbeddingModel();
    const BATCH = 32;
    const embeddings: number[][] = [];
    for (let i = 0; i < staged.length; i += BATCH) {
      const slice = staged.slice(i, i + BATCH).map((s) => s.content);
      const { embeddings: batch } = await embedMany({
        model: embeddingModel,
        values: slice,
        providerOptions: EMBEDDING_PROVIDER_OPTIONS,
      });
      embeddings.push(...batch);
    }

    // The `section` column is added by the 2026-04-22 migration; once
    // `pnpm db:types` runs after the migration applies, the cast here
    // can go away. Until then, satisfy the generated chunks insert
    // shape by widening the row type.
    const rows = staged.map((s, i) => ({
      document_id: doc.id,
      page_number: s.page,
      chunk_index: s.index,
      content: s.content,
      section: s.section,
      embedding: embeddings[i] as unknown as string,
      token_count: Math.ceil(s.content.length / 4),
    }));

    const INSERT_BATCH = 100;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH);
      const { error } = await supabase
        .from('chunks')
        // biome-ignore lint/suspicious/noExplicitAny: generated types predate the section column; regenerate after migration applies
        .insert(batch as any);
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
