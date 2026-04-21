-- Section-aware retrieval (ultraplan 2026-04-22)
--
-- Every chunk now carries the IMRaD section it was cut from
-- (introduction / methods / results / conclusion / etc.). This unlocks
-- section-biased scoring in the retrieval pipeline so "what did they
-- conclude?" questions prefer conclusion-section passages over methods
-- chunks with similar cosine similarity.
--
-- Additive migration: default 'other' means previously-ingested chunks
-- keep working; they'll be replaced by a real section on the next
-- `pnpm ingest:corpus` run.

alter table public.chunks
  add column if not exists section text not null default 'other';

create index if not exists chunks_section_idx on public.chunks(section);

-- Replace the RPC to also return the section. Additive change to the
-- returned row shape — existing callers that ignore the new column keep
-- compiling until we regenerate types.
create or replace function public.search_chunks(
  query_embedding vector(768),
  match_count int default 8,
  similarity_threshold float default 0.0
)
returns table (
  chunk_id uuid,
  document_id uuid,
  page_number int,
  content text,
  section text,
  similarity float,
  document_title text,
  document_filename text
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.page_number,
    c.content,
    c.section,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.filename as document_filename
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
