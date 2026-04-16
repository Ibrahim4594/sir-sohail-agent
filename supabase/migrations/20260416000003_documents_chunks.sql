create table public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  title text,
  summary text,
  storage_path text not null,
  page_count int,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  error_message text
);

create index documents_uploaded_by_idx on public.documents(uploaded_by);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  token_count int,
  created_at timestamptz not null default now()
);

create index chunks_document_id_idx on public.chunks(document_id);
create index chunks_embedding_idx
  on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RPC: vector similarity search
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
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    d.filename as document_filename
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
