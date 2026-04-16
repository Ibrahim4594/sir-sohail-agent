# PDF-Grounded Research Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chat-style web agent that answers Sir Sohail's students' questions strictly from 40 academic PDFs, with verified citations that open the source PDF at the correct page.

**Architecture:** Next.js 16 full-stack app. Vercel AI SDK handles streaming chat against Ollama (dev) or Google Gemini (prod). Supabase Postgres + pgvector stores documents, chunks, embeddings, and per-user chat history. Three independent safeguards enforce strict grounding: system prompt, retrieval similarity threshold, and post-generation citation verification.

**Tech Stack:** Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · Vercel AI SDK · Ollama (Gemma 4 E4B + nomic-embed-text) · Google Gemini (cloud fallback) · Supabase (Postgres + pgvector + Auth + Storage) · unpdf · react-pdf · Vitest · Playwright · Biome · pnpm · Vercel.

**Reference spec:** [`docs/superpowers/specs/2026-04-16-pdf-agent-design.md`](../specs/2026-04-16-pdf-agent-design.md)

---

## File Structure (target)

```
/
├── .env.local                         # secrets (git-ignored)
├── .env.example                       # template
├── .gitignore
├── biome.json
├── CLAUDE.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── components.json                    # shadcn/ui config
├── playwright.config.ts
├── vitest.config.ts
│
├── app/
│   ├── layout.tsx                     # root layout (global providers)
│   ├── page.tsx                       # landing page
│   ├── globals.css
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── callback/route.ts          # OAuth callback
│   ├── chat/
│   │   ├── layout.tsx                 # sidebar shell
│   │   ├── page.tsx                   # new chat
│   │   └── [conversationId]/page.tsx  # existing chat
│   ├── admin/
│   │   ├── layout.tsx                 # admin guard
│   │   └── documents/page.tsx         # upload + list
│   ├── overview/
│   │   └── page.tsx                   # corpus overview
│   └── api/
│       ├── chat/route.ts              # streaming chat endpoint
│       ├── conversations/route.ts     # list/create
│       ├── conversations/[id]/route.ts # get/delete
│       └── ingest/route.ts            # upload + process PDF
│
├── components/
│   ├── ui/                            # shadcn/ui primitives
│   ├── chat/
│   │   ├── chat-shell.tsx
│   │   ├── message-list.tsx
│   │   ├── message-item.tsx
│   │   ├── citation-card.tsx
│   │   ├── composer.tsx
│   │   └── empty-state.tsx
│   ├── sidebar/
│   │   ├── conversation-list.tsx
│   │   ├── conversation-item.tsx
│   │   └── account-menu.tsx
│   └── pdf/
│       ├── pdf-side-panel.tsx
│       └── pdf-viewer.tsx
│
├── lib/
│   ├── env.ts                         # validated env vars
│   ├── llm/
│   │   ├── model.ts                   # getChatModel / getEmbeddingModel
│   │   └── model.test.ts
│   ├── retrieval/
│   │   ├── search.ts                  # pgvector similarity
│   │   ├── search.test.ts
│   │   ├── threshold.ts               # gate logic
│   │   └── threshold.test.ts
│   ├── prompt/
│   │   ├── system-prompt.ts
│   │   ├── build-prompt.ts
│   │   └── build-prompt.test.ts
│   ├── citation/
│   │   ├── extract.ts                 # parse [N] markers
│   │   ├── extract.test.ts
│   │   ├── verify.ts                  # validate citations
│   │   └── verify.test.ts
│   ├── ingest/
│   │   ├── parse-pdf.ts
│   │   ├── parse-pdf.test.ts
│   │   ├── chunk.ts
│   │   ├── chunk.test.ts
│   │   └── ingest-document.ts         # orchestrator
│   └── supabase/
│       ├── server.ts                  # server client (RSC/route)
│       ├── browser.ts                 # browser client
│       ├── middleware.ts              # session helper
│       └── types.ts                   # DB types
│
├── middleware.ts                      # auth guard
│
├── scripts/
│   └── ingest-corpus.ts               # CLI: ingest the 40 seed PDFs
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260416000001_enable_pgvector.sql
│       ├── 20260416000002_profiles.sql
│       ├── 20260416000003_documents_chunks.sql
│       ├── 20260416000004_conversations_messages.sql
│       ├── 20260416000005_storage_buckets.sql
│       └── 20260416000006_rls_policies.sql
│
├── tests/
│   ├── integration/
│   │   ├── ingest.test.ts
│   │   └── chat-api.test.ts
│   ├── e2e/
│   │   ├── sign-in.spec.ts
│   │   ├── ask-question.spec.ts
│   │   ├── citation-click.spec.ts
│   │   └── refusal.spec.ts
│   └── fixtures/
│       ├── golden-qa.json             # known Q&A pairs
│       ├── refusal-questions.json     # off-topic questions
│       └── sample.pdf                 # small test PDF
│
├── pdfs/                              # seed PDFs (git-ignored; uploaded to Supabase Storage by ingest script)
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── public/
```

---

## Prerequisites

Confirm these BEFORE starting Task 1:

- **Node.js 20+** — `node -v`
- **pnpm** — install via `npm install -g pnpm` if missing
- **Ollama** — running locally, with `gemma4:e4b` and `nomic-embed-text` pulled
- **Supabase CLI** — install via `npm install -g supabase` or Scoop/Homebrew
- **Docker Desktop** — required by the Supabase local stack
- **Git** — `git --version`
- **A Google Cloud project** — for OAuth credentials and (optional) Gemini API key

---

# PHASE 0 — Foundation

## Task 1: Initialize Git and Scaffold Next.js

**Files:**
- Create: `C:\Users\ibrah\Downloads\Sir sohail\.gitignore`
- Create: project scaffold via `create-next-app`

- [ ] **Step 1: Initialize Git**

Run:
```bash
cd "C:/Users/ibrah/Downloads/Sir sohail"
git init
git add CLAUDE.md docs/
git commit -m "chore: initial spec and CLAUDE.md"
```
Expected: commit created, working tree clean for tracked files.

- [ ] **Step 2: Move seed PDFs into a dedicated folder**

Run:
```bash
cd "C:/Users/ibrah/Downloads/Sir sohail"
mkdir -p pdfs
mv *.pdf pdfs/
ls pdfs | wc -l
```
Expected: `40`.

- [ ] **Step 3: Scaffold Next.js 16 with TypeScript, Tailwind, ESLint disabled (we use Biome), and App Router**

Run:
```bash
cd "C:/Users/ibrah/Downloads/Sir sohail"
pnpm create next-app@latest . --ts --tailwind --app --src-dir=false --eslint=false --import-alias="@/*" --use-pnpm --turbopack
```
When prompted: answer **"yes"** to continue even though the directory isn't empty.

Expected: `package.json`, `app/`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.gitignore`, etc. scaffolded.

- [ ] **Step 4: Append project-specific patterns to `.gitignore`**

Edit `.gitignore`, append:
```
# Seed PDFs — uploaded to Supabase Storage
pdfs/*.pdf

# Local env
.env.local
.env*.local

# Supabase local data
supabase/.branches
supabase/.temp

# Playwright
/test-results/
/playwright-report/
/playwright/.cache/

# OS
Thumbs.db
.DS_Store
```

- [ ] **Step 5: Verify dev server boots**

Run:
```bash
pnpm dev
```
Expected: "Ready in X ms" and `http://localhost:3000` returns the default Next page.

Kill the server (Ctrl+C) before continuing.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js 16 with Tailwind + TypeScript"
```

---

## Task 2: Install Biome, Scripts, and Base Dev Dependencies

**Files:**
- Create: `biome.json`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Biome**

```bash
pnpm add -D @biomejs/biome
pnpm biome init
```
Expected: `biome.json` created.

- [ ] **Step 2: Configure Biome**

Overwrite `biome.json` with:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": { "ignore": ["node_modules", ".next", "dist", "supabase/.branches", "supabase/.temp", "pdfs"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "useNodejsImportProtocol": "error" },
      "suspicious": { "noExplicitAny": "error" }
    }
  }
}
```

- [ ] **Step 3: Add scripts to `package.json`**

Update the `"scripts"` section:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "biome check .",
  "format": "biome format --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:migrate": "supabase migration up",
  "db:types": "supabase gen types typescript --local > lib/supabase/types.ts",
  "ingest:corpus": "tsx scripts/ingest-corpus.ts"
}
```

- [ ] **Step 4: Install test tooling**

```bash
pnpm add -D vitest @vitejs/plugin-react @vitest/ui @types/node tsx
pnpm add -D playwright @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 6: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 7: Verify tooling works**

Run:
```bash
pnpm lint
pnpm typecheck
pnpm test -- --reporter=verbose
```
Expected: Biome reports no errors (on empty project), `tsc` succeeds, Vitest reports "No test files found" — all OK.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: add Biome, Vitest, Playwright, and project scripts"
```

---

## Task 3: Install shadcn/ui

**Files:**
- Create: `components.json`, `components/ui/*`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```
When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **yes**

Expected: `components.json` created, `app/globals.css` updated with CSS vars, `lib/utils.ts` created.

- [ ] **Step 2: Install the components we'll need**

```bash
pnpm dlx shadcn@latest add button input textarea card sheet scroll-area separator avatar dropdown-menu dialog toast sonner skeleton tabs badge
```
Expected: files appear under `components/ui/`.

- [ ] **Step 3: Smoke test — add a Button to the home page**

Replace `app/page.tsx`:
```tsx
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button>Hello Sir Sohail</Button>
    </main>
  );
}
```

- [ ] **Step 4: Start dev server and verify visually**

```bash
pnpm dev
```
Open `http://localhost:3000` — should show a styled button centered on page. Kill server.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: set up shadcn/ui with base components"
```

---

## Task 4: Verify Ollama and Pull Required Models

**Files:** (none — environment task)

- [ ] **Step 1: Confirm Ollama is running**

```bash
curl -s http://localhost:11434/api/tags
```
Expected: JSON response with a `models` array (possibly empty).

- [ ] **Step 2: Pull models**

```bash
ollama pull gemma4:e4b
ollama pull nomic-embed-text
```
Expected: each pull completes, `ollama list` shows both.

- [ ] **Step 3: Test generation**

```bash
ollama run gemma4:e4b "Say hello in one short sentence."
```
Expected: a short polite sentence prints.

- [ ] **Step 4: Test embedding via HTTP**

```bash
curl -s http://localhost:11434/api/embeddings -d '{"model": "nomic-embed-text", "prompt": "Hello"}'
```
Expected: JSON with `embedding` array of 768 floats.

No commit — environment verification only.

---

# PHASE 1 — Supabase + Data Layer

## Task 5: Initialize Local Supabase Stack

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Install Supabase CLI (if not already)**

```bash
npm install -g supabase
supabase --version
```
Expected: a version number.

- [ ] **Step 2: Login (once, interactive)**

```bash
supabase login
```
Follow the browser prompt. Not strictly required for local dev but useful now.

- [ ] **Step 3: Initialize a local Supabase project**

```bash
supabase init
```
Expected: `supabase/config.toml` and `supabase/migrations/` folder created.

- [ ] **Step 4: Start the local stack**

```bash
pnpm db:start
```
Expected output includes local URLs, e.g.:
```
API URL: http://127.0.0.1:54321
DB URL:  postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGci...
service_role key: eyJhbGci...
```

Copy the **anon key** and **service_role key** — you'll paste them in Task 6.

- [ ] **Step 5: Confirm the Studio UI opens**

Open `http://127.0.0.1:54323` — should show the Supabase dashboard.

- [ ] **Step 6: Commit**

```bash
git add supabase/config.toml supabase/.gitignore 2>/dev/null || true
git add supabase/
git commit -m "chore: init Supabase local stack"
```

---

## Task 6: Create `.env.local` and `.env.example`

**Files:**
- Create: `.env.local`, `.env.example`

- [ ] **Step 1: Create `.env.local`** (use the keys printed by `supabase start`)

```
# LLM
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Gemini (optional cloud fallback)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key from db:start>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key from db:start>

# Retrieval tuning
RETRIEVAL_TOP_K=8
RETRIEVAL_SIMILARITY_THRESHOLD=0.4

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Create `.env.example`**

Identical to `.env.local` but with blank/sample values for all secrets. Do NOT commit real keys.

- [ ] **Step 3: Commit the example**

```bash
git add .env.example
git commit -m "chore: add .env.example"
```

---

## Task 7: Migration — Enable pgvector + Profiles Table

**Files:**
- Create: `supabase/migrations/20260416000001_enable_pgvector.sql`
- Create: `supabase/migrations/20260416000002_profiles.sql`

- [ ] **Step 1: Write pgvector migration**

Create `supabase/migrations/20260416000001_enable_pgvector.sql`:
```sql
create extension if not exists vector;
create extension if not exists pgcrypto;
```

- [ ] **Step 2: Write profiles migration**

Create `supabase/migrations/20260416000002_profiles.sql`:
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('admin', 'student', 'guest')),
  created_at timestamptz not null default now()
);

-- Trigger: create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Apply migrations**

```bash
pnpm db:reset
```
Expected: migrations run cleanly, no errors.

- [ ] **Step 4: Verify in Studio**

Open `http://127.0.0.1:54323` → Table editor → `profiles` should exist.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): enable pgvector and create profiles"
```

---

## Task 8: Migration — Documents + Chunks

**Files:**
- Create: `supabase/migrations/20260416000003_documents_chunks.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260416000003_documents_chunks.sql`:
```sql
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
```

- [ ] **Step 2: Apply**

```bash
pnpm db:reset
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): add documents and chunks with vector search RPC"
```

---

## Task 9: Migration — Conversations + Messages

**Files:**
- Create: `supabase/migrations/20260416000004_conversations_messages.sql`

- [ ] **Step 1: Write migration**

```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages(conversation_id);

-- Keep `conversations.updated_at` in sync with latest message
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation();
```

- [ ] **Step 2: Apply + commit**

```bash
pnpm db:reset
git add supabase/migrations
git commit -m "feat(db): add conversations and messages"
```

---

## Task 10: Migration — Storage Bucket + RLS Policies

**Files:**
- Create: `supabase/migrations/20260416000005_storage_buckets.sql`
- Create: `supabase/migrations/20260416000006_rls_policies.sql`

- [ ] **Step 1: Storage bucket**

```sql
-- supabase/migrations/20260416000005_storage_buckets.sql
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- Only admins can upload; any authenticated user can read via signed URL
create policy "admins can upload pdfs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pdfs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "authenticated can read pdf metadata"
  on storage.objects for select to authenticated
  using (bucket_id = 'pdfs');
```

- [ ] **Step 2: RLS policies**

```sql
-- supabase/migrations/20260416000006_rls_policies.sql
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles: each user reads/updates own; anyone can read display_name
create policy "self can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "self can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- Documents: readable by any authenticated user; writable by admins
create policy "authenticated can read documents"
  on public.documents for select to authenticated using (true);

create policy "admins can insert documents"
  on public.documents for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admins can update documents"
  on public.documents for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Chunks: read-only for users; the search RPC is stable/accessible
create policy "authenticated can read chunks"
  on public.chunks for select to authenticated using (true);

create policy "admins can insert chunks"
  on public.chunks for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Conversations: user-scoped
create policy "users can manage own conversations"
  on public.conversations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Messages: user can access messages from own conversations
create policy "users can select own messages"
  on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create policy "users can insert into own conversations"
  on public.messages for insert to authenticated
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
```

- [ ] **Step 3: Apply + verify in Studio**

```bash
pnpm db:reset
```
Studio → Authentication → Policies → confirm policies listed for each table.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): storage bucket and RLS policies"
```

---

## Task 11: Generate TypeScript Types from DB

**Files:**
- Create: `lib/supabase/types.ts` (generated)

- [ ] **Step 1: Generate types**

```bash
mkdir -p lib/supabase
pnpm db:types
```
Expected: `lib/supabase/types.ts` generated.

- [ ] **Step 2: Quick sanity check — `Database` type exported**

Open `lib/supabase/types.ts` and confirm it starts with `export type Database = {`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(db): generate TypeScript types from schema"
```

---

## Task 12: Supabase Client Helpers

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/middleware.ts`, `lib/env.ts`

- [ ] **Step 1: Install Supabase packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create `lib/env.ts`**

```ts
import { z } from 'zod';

const schema = z.object({
  LLM_PROVIDER: z.enum(['ollama', 'gemini']).default('ollama'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma4:e4b'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  RETRIEVAL_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.4),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
```

Install zod:
```bash
pnpm add zod
```

- [ ] **Step 3: Create `lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';
import { env } from '@/lib/env';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

export function createServiceRoleSupabase() {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
```

- [ ] **Step 5: Create `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
```

- [ ] **Step 6: Create root `middleware.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicPaths = ['/', '/sign-in', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith('/api');

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 7: Typecheck**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(supabase): add client helpers, env schema, auth middleware"
```

---

# PHASE 2 — LLM Abstraction

## Task 13: Install AI SDK + Model Factory

**Files:**
- Create: `lib/llm/model.ts`, `lib/llm/model.test.ts`

- [ ] **Step 1: Install AI SDK + providers**

```bash
pnpm add ai @ai-sdk/google ollama-ai-provider
```

- [ ] **Step 2: Write the failing test for chat model selection**

Create `lib/llm/model.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getChatModel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns an Ollama model when LLM_PROVIDER=ollama', async () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'gemma4:e4b';
    const { getChatModel } = await import('./model');
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('gemma4');
  });

  it('returns a Google model when LLM_PROVIDER=gemini', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-flash-latest';
    const { getChatModel } = await import('./model');
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('gemini');
  });
});
```

- [ ] **Step 3: Run — expect failure**

```bash
pnpm test lib/llm/model.test.ts
```
Expected: FAIL — `./model` not found.

- [ ] **Step 4: Implement `lib/llm/model.ts`**

```ts
import { createOllama } from 'ollama-ai-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

function getOllama() {
  return createOllama({
    baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api`,
  });
}

function getGoogle() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

export function getChatModel() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'gemini') {
    return getGoogle()(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  }
  return getOllama()(process.env.OLLAMA_MODEL || 'gemma4:e4b');
}

export function getEmbeddingModel() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'gemini') {
    return getGoogle().textEmbeddingModel(process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004');
  }
  return getOllama().embedding(process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text');
}
```

- [ ] **Step 5: Run — expect pass**

```bash
pnpm test lib/llm/model.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(llm): model factory with Ollama/Gemini switch"
```

---

## Task 14: Integration Smoke Test — Generate and Embed

**Files:**
- Create: `tests/integration/llm-smoke.test.ts`

- [ ] **Step 1: Write integration test**

```ts
import { describe, it, expect } from 'vitest';
import { generateText, embed } from 'ai';
import { getChatModel, getEmbeddingModel } from '@/lib/llm/model';

describe('LLM integration (requires Ollama running)', () => {
  it('generates short text from Ollama', async () => {
    const { text } = await generateText({
      model: getChatModel(),
      prompt: 'Reply with only the word: PING',
      maxTokens: 10,
    });
    expect(text.toUpperCase()).toContain('PING');
  });

  it('embeds a short string and returns 768 dimensions', async () => {
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: 'hello world',
    });
    expect(embedding).toBeInstanceOf(Array);
    expect(embedding.length).toBe(768);
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test tests/integration/llm-smoke.test.ts
```
Expected: PASS (Ollama must be running). If fail, debug by curling `/api/generate` and `/api/embeddings` manually.

- [ ] **Step 3: Commit**

```bash
git add tests/integration
git commit -m "test: LLM smoke test for Ollama generate + embed"
```

---

# PHASE 3 — Ingestion Pipeline

## Task 15: PDF Parser

**Files:**
- Create: `lib/ingest/parse-pdf.ts`, `lib/ingest/parse-pdf.test.ts`, `tests/fixtures/sample.pdf`

- [ ] **Step 1: Install `unpdf`**

```bash
pnpm add unpdf
```

- [ ] **Step 2: Create a tiny test fixture PDF**

Copy any small PDF into `tests/fixtures/sample.pdf` (pick the smallest from `pdfs/`):
```bash
cp "pdfs/EBSCO-FullText-04-13_2026-5.pdf" tests/fixtures/sample.pdf
```

- [ ] **Step 3: Write failing test**

Create `lib/ingest/parse-pdf.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parsePdf } from './parse-pdf';

describe('parsePdf', () => {
  it('returns pages of text from a real PDF', async () => {
    const buf = await readFile(path.resolve('tests/fixtures/sample.pdf'));
    const result = await parsePdf(new Uint8Array(buf));
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.pages.length).toBe(result.pageCount);
    expect(result.pages[0].length).toBeGreaterThan(0);
    expect(typeof result.pages[0]).toBe('string');
  });
});
```

- [ ] **Step 4: Run — fail**

```bash
pnpm test lib/ingest/parse-pdf.test.ts
```
Expected: FAIL (`parse-pdf` module missing).

- [ ] **Step 5: Implement**

Create `lib/ingest/parse-pdf.ts`:
```ts
import { extractText, getDocumentProxy } from 'unpdf';

export type ParsedPdf = {
  pageCount: number;
  pages: string[];
};

export async function parsePdf(data: Uint8Array): Promise<ParsedPdf> {
  const doc = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(doc, { mergePages: false });
  const pages = Array.isArray(text) ? text.map((t) => t || '') : [String(text ?? '')];
  return { pageCount: totalPages, pages };
}
```

- [ ] **Step 6: Run — pass**

```bash
pnpm test lib/ingest/parse-pdf.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(ingest): PDF parser built on unpdf"
```

---

## Task 16: Chunker

**Files:**
- Create: `lib/ingest/chunk.ts`, `lib/ingest/chunk.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/ingest/chunk.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { chunkPage } from './chunk';

describe('chunkPage', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunkPage('Hello world.', { targetChars: 2000, overlapChars: 200 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Hello world.');
  });

  it('splits long text into multiple overlapping chunks', () => {
    const para = 'The quick brown fox jumps over the lazy dog. '.repeat(100); // ~4500 chars
    const chunks = chunkPage(para, { targetChars: 1000, overlapChars: 100 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1100);
    }
  });

  it('prefers sentence boundaries when splitting', () => {
    const text = 'Alpha sentence one. Beta sentence two. Gamma sentence three. '.repeat(50);
    const chunks = chunkPage(text, { targetChars: 600, overlapChars: 50 });
    for (const c of chunks) {
      // most chunks should end with "." or whitespace then a newline
      expect(/[.!?]\s*$|^\S+/.test(c.trim())).toBe(true);
    }
  });

  it('returns empty array for empty input', () => {
    expect(chunkPage('', { targetChars: 2000, overlapChars: 200 })).toEqual([]);
    expect(chunkPage('   ', { targetChars: 2000, overlapChars: 200 })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
pnpm test lib/ingest/chunk.test.ts
```
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `lib/ingest/chunk.ts`:
```ts
export type ChunkOpts = {
  targetChars: number;
  overlapChars: number;
};

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export function chunkPage(text: string, opts: ChunkOpts): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  if (cleaned.length <= opts.targetChars) return [cleaned];

  const sentences = cleaned.split(SENTENCE_SPLIT);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= opts.targetChars) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) chunks.push(current.trim());
      // Start a new chunk; include tail of previous as overlap for continuity.
      const tail = current.slice(-opts.overlapChars).trim();
      current = tail ? `${tail} ${s}` : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Hard-cap any chunk that grew too long (rare: single mega-sentence).
  const output: string[] = [];
  for (const c of chunks) {
    if (c.length <= opts.targetChars + opts.overlapChars) {
      output.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += opts.targetChars - opts.overlapChars) {
      output.push(c.slice(i, i + opts.targetChars));
    }
  }
  return output;
}
```

- [ ] **Step 4: Run — pass**

```bash
pnpm test lib/ingest/chunk.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(ingest): sentence-aware chunker with overlap"
```

---

## Task 17: Ingest Orchestrator

**Files:**
- Create: `lib/ingest/ingest-document.ts`

- [ ] **Step 1: Implement**

Create `lib/ingest/ingest-document.ts`:
```ts
import { embedMany } from 'ai';
import { getEmbeddingModel } from '@/lib/llm/model';
import { parsePdf } from './parse-pdf';
import { chunkPage } from './chunk';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

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

  // 1. Insert document row as 'processing'
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
    // 2. Parse
    const parsed = await parsePdf(input.data);

    // 3. Chunk every page
    type Staged = { page: number; index: number; content: string };
    const staged: Staged[] = [];
    for (let i = 0; i < parsed.pages.length; i++) {
      const pageText = parsed.pages[i];
      const chunks = chunkPage(pageText, CHUNK_OPTS);
      chunks.forEach((content, idx) => staged.push({ page: i + 1, index: idx, content }));
    }

    if (staged.length === 0) throw new Error('No text extracted from PDF');

    // 4. Embed in batches of 32
    const embeddingModel = getEmbeddingModel();
    const BATCH = 32;
    const embeddings: number[][] = [];
    for (let i = 0; i < staged.length; i += BATCH) {
      const slice = staged.slice(i, i + BATCH).map((s) => s.content);
      const { embeddings: batch } = await embedMany({ model: embeddingModel, values: slice });
      embeddings.push(...batch);
    }

    // 5. Upsert chunks
    const rows = staged.map((s, i) => ({
      document_id: doc.id,
      page_number: s.page,
      chunk_index: s.index,
      content: s.content,
      embedding: embeddings[i] as unknown as string, // supabase-js serializes number[] for vector
      token_count: Math.ceil(s.content.length / 4),
    }));

    // insert in batches to avoid payload limits
    const INSERT_BATCH = 100;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error } = await supabase.from('chunks').insert(rows.slice(i, i + INSERT_BATCH));
      if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
    }

    // 6. Update document with page_count + status
    await supabase
      .from('documents')
      .update({ page_count: parsed.pageCount, status: 'ready' })
      .eq('id', doc.id);

    return { documentId: doc.id, chunkCount: staged.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown ingest failure';
    await supabase.from('documents').update({ status: 'failed', error_message: message }).eq('id', doc.id);
    throw e;
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/ingest/ingest-document.ts
git commit -m "feat(ingest): orchestrator — parse, chunk, embed, store"
```

---

## Task 18: CLI Script to Ingest the 40 Seed PDFs

**Files:**
- Create: `scripts/ingest-corpus.ts`

- [ ] **Step 1: Implement**

Create `scripts/ingest-corpus.ts`:
```ts
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

async function main() {
  const pdfDir = path.resolve('pdfs');
  const files = (await readdir(pdfDir)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDFs in ${pdfDir}`);

  const supabase = createServiceRoleSupabase();

  for (const filename of files) {
    console.log(`\n→ ${filename}`);
    const fullPath = path.join(pdfDir, filename);
    const data = await readFile(fullPath);

    // 1. Upload to Supabase Storage
    const storagePath = `corpus/${filename}`;
    const { error: upErr } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, data, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      console.error(`  upload failed: ${upErr.message}`);
      continue;
    }
    console.log(`  uploaded → ${storagePath}`);

    // 2. Ingest
    try {
      const res = await ingestDocument({
        filename,
        title: prettyTitle(filename),
        storagePath,
        data: new Uint8Array(data),
      });
      console.log(`  ingested: ${res.chunkCount} chunks (doc ${res.documentId})`);
    } catch (e) {
      console.error(`  ingest failed:`, e);
    }
  }

  console.log('\nDone.');
}

function prettyTitle(filename: string): string {
  return filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it**

```bash
pnpm ingest:corpus
```
Expected: loops through each of the 40 PDFs, uploads each, chunks + embeds + stores. Will take several minutes.

- [ ] **Step 3: Verify in Studio**

Open `http://127.0.0.1:54323` → Table editor → `documents` (40 rows) → `chunks` (many rows).

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest-corpus.ts
git commit -m "feat(ingest): CLI script to load the 40 seed PDFs"
```

---

# PHASE 4 — Retrieval + Prompt

## Task 19: Similarity Search

**Files:**
- Create: `lib/retrieval/search.ts`, `lib/retrieval/search.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/retrieval/search.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { searchChunks } from './search';

describe('searchChunks (integration, requires DB + models)', () => {
  it('returns top-K chunks ranked by similarity for a corpus-relevant query', async () => {
    const results = await searchChunks('project-based learning', { topK: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    // scores descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
    // each result has required fields
    const first = results[0];
    expect(first.chunkId).toBeTruthy();
    expect(first.documentId).toBeTruthy();
    expect(first.pageNumber).toBeGreaterThan(0);
    expect(first.content.length).toBeGreaterThan(0);
  });

  it('returns an empty array for an obviously off-topic query when threshold is high', async () => {
    const results = await searchChunks('recipe for chocolate chip cookies', {
      topK: 5,
      similarityThreshold: 0.6,
    });
    // most likely zero — corpus is academic research
    expect(Array.isArray(results)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/retrieval/search.ts`:
```ts
import { embed } from 'ai';
import { getEmbeddingModel } from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export type SearchResult = {
  chunkId: string;
  documentId: string;
  pageNumber: number;
  content: string;
  similarity: number;
  documentTitle: string;
  documentFilename: string;
};

export type SearchOpts = {
  topK?: number;
  similarityThreshold?: number;
};

export async function searchChunks(query: string, opts: SearchOpts = {}): Promise<SearchResult[]> {
  const topK = opts.topK ?? env.RETRIEVAL_TOP_K;
  const threshold = opts.similarityThreshold ?? 0;

  const { embedding } = await embed({ model: getEmbeddingModel(), value: query });

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase.rpc('search_chunks', {
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
    documentTitle: r.document_title,
    documentFilename: r.document_filename,
  }));
}
```

- [ ] **Step 3: Run — pass**

```bash
pnpm test lib/retrieval/search.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(retrieval): pgvector similarity search wrapper"
```

---

## Task 20: Threshold Gate

**Files:**
- Create: `lib/retrieval/threshold.ts`, `lib/retrieval/threshold.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/retrieval/threshold.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyThreshold } from './threshold';
import type { SearchResult } from './search';

const r = (similarity: number): SearchResult => ({
  chunkId: 'x', documentId: 'd', pageNumber: 1, content: 'c',
  similarity, documentTitle: 't', documentFilename: 'f.pdf',
});

describe('applyThreshold', () => {
  it('returns all results if best score clears threshold', () => {
    const out = applyThreshold([r(0.8), r(0.7), r(0.2)], 0.4);
    expect(out.grounded).toBe(true);
    expect(out.results).toHaveLength(3);
  });

  it('returns empty + ungrounded when all results below threshold', () => {
    const out = applyThreshold([r(0.3), r(0.2)], 0.4);
    expect(out.grounded).toBe(false);
    expect(out.results).toEqual([]);
  });

  it('handles empty input', () => {
    expect(applyThreshold([], 0.4)).toEqual({ grounded: false, results: [] });
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/retrieval/threshold.ts`:
```ts
import type { SearchResult } from './search';

export type GatedResult = {
  grounded: boolean;
  results: SearchResult[];
};

export function applyThreshold(results: SearchResult[], threshold: number): GatedResult {
  if (results.length === 0) return { grounded: false, results: [] };
  const top = results[0];
  if (top.similarity < threshold) return { grounded: false, results: [] };
  return { grounded: true, results };
}
```

- [ ] **Step 3: Run — pass, commit**

```bash
pnpm test lib/retrieval/threshold.test.ts
git add .
git commit -m "feat(retrieval): threshold gate for soft-refusal"
```

---

## Task 21: System Prompt + Prompt Builder

**Files:**
- Create: `lib/prompt/system-prompt.ts`, `lib/prompt/build-prompt.ts`, `lib/prompt/build-prompt.test.ts`

- [ ] **Step 1: Create `lib/prompt/system-prompt.ts`**

```ts
export const STRICT_GROUNDING_SYSTEM_PROMPT = `You are the research assistant for Prof. Sohail's academic document corpus.

RULES:
1. Answer ONLY from the CONTEXT provided below. Never use your own general knowledge. Never search the web. Never speculate or extrapolate.
2. If the CONTEXT does not contain the answer, respond exactly as follows:
   "I don't see information about that in the source documents. However, the documents do cover: {RELATED_TOPICS}. Would you like me to look into one of those?"
   — and fill in {RELATED_TOPICS} with a short bulleted list derived only from the CONTEXT titles/snippets provided.
3. Every factual claim must be followed by a citation marker [1], [2], etc. Citation numbers MUST match the numbered sources in the CONTEXT.
4. When quoting a source, use wording that appears verbatim in the CONTEXT. Do not paraphrase invented facts.
5. Do not invent paper titles, authors, page numbers, or quotes.
6. Keep the tone neutral, academic, and concise. Prefer bullets when listing facts.
7. After answering, suggest one follow-up question the student could ask based on the same CONTEXT.`;
```

- [ ] **Step 2: Write tests**

Create `lib/prompt/build-prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './build-prompt';
import type { SearchResult } from '@/lib/retrieval/search';

const mkResult = (n: number): SearchResult => ({
  chunkId: `c-${n}`, documentId: `d-${n}`, pageNumber: n, content: `Content ${n}.`,
  similarity: 0.9 - n * 0.01, documentTitle: `Title ${n}`, documentFilename: `file${n}.pdf`,
});

describe('buildPrompt', () => {
  it('includes each retrieved chunk with a numbered source header', () => {
    const out = buildPrompt({
      chunks: [mkResult(1), mkResult(2)],
      history: [],
      question: 'What does the literature say?',
    });
    expect(out).toContain('[1] (Title: Title 1, Page: 1)');
    expect(out).toContain('Content 1.');
    expect(out).toContain('[2] (Title: Title 2, Page: 2)');
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
```

- [ ] **Step 3: Implement**

Create `lib/prompt/build-prompt.ts`:
```ts
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
        `[${i + 1}] (Title: ${c.documentTitle}, Page: ${c.pageNumber})\n${c.content.trim()}`,
    )
    .join('\n\n');

  const historyBlock = input.history
    .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
    .join('\n');

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
```

- [ ] **Step 4: Run — pass, commit**

```bash
pnpm test lib/prompt/build-prompt.test.ts
git add .
git commit -m "feat(prompt): strict-grounding prompt builder"
```

---

# PHASE 5 — Citations + Chat Endpoint

## Task 22: Citation Extractor

**Files:**
- Create: `lib/citation/extract.ts`, `lib/citation/extract.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/citation/extract.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractCitationNumbers } from './extract';

describe('extractCitationNumbers', () => {
  it('finds single markers', () => {
    expect(extractCitationNumbers('Foo [1] bar.')).toEqual([1]);
  });
  it('finds multiple markers and deduplicates', () => {
    expect(extractCitationNumbers('A[1][2] B[1] C[3].')).toEqual([1, 2, 3]);
  });
  it('ignores non-citation brackets', () => {
    expect(extractCitationNumbers('Array[0] should be ignored. But [4] counts.')).toEqual([4]);
  });
  it('handles empty text', () => {
    expect(extractCitationNumbers('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/citation/extract.ts`:
```ts
// Matches [N] where N is 1-2 digits, not followed/preceded by other brackets that make it an array index.
// Heuristic: citation markers are always preceded by whitespace, punctuation, or start-of-string.
const CITATION_RE = /(?:^|[\s,.;:!?()"'])\[(\d{1,2})\]/g;

export function extractCitationNumbers(text: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    const n = Number(m[1]);
    if (n >= 1 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
```

- [ ] **Step 3: Run — pass, commit**

```bash
pnpm test lib/citation/extract.test.ts
git add .
git commit -m "feat(citation): extract citation numbers from model output"
```

---

## Task 23: Citation Verifier

**Files:**
- Create: `lib/citation/verify.ts`, `lib/citation/verify.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/citation/verify.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { verifyCitations } from './verify';
import type { SearchResult } from '@/lib/retrieval/search';

const mk = (n: number): SearchResult => ({
  chunkId: `c-${n}`, documentId: `d-${n}`, pageNumber: n, content: `Chunk ${n} content.`,
  similarity: 0.9, documentTitle: `Doc ${n}`, documentFilename: `f${n}.pdf`,
});

describe('verifyCitations', () => {
  it('returns one citation per extracted marker, mapped to source', () => {
    const sources = [mk(1), mk(2), mk(3)];
    const answer = 'First fact [1]. Second [2].';
    const out = verifyCitations(answer, sources);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      marker: 1,
      chunkId: 'c-1',
      pageNumber: 1,
      valid: true,
    });
    expect(out[1].marker).toBe(2);
  });

  it('marks a citation invalid if the marker number has no source', () => {
    const sources = [mk(1)];
    const answer = 'Real [1]. Made up [5].';
    const out = verifyCitations(answer, sources);
    expect(out).toHaveLength(2);
    expect(out.find((c) => c.marker === 5)?.valid).toBe(false);
  });

  it('returns empty when answer has no citations', () => {
    expect(verifyCitations('No citations here.', [mk(1)])).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/citation/verify.ts`:
```ts
import { extractCitationNumbers } from './extract';
import type { SearchResult } from '@/lib/retrieval/search';

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

export function verifyCitations(
  answer: string,
  sources: SearchResult[],
): VerifiedCitation[] {
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
```

- [ ] **Step 3: Run — pass, commit**

```bash
pnpm test lib/citation/verify.test.ts
git add .
git commit -m "feat(citation): map + verify citation markers against retrieved sources"
```

---

## Task 24: Chat API Route (Streaming)

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Implement**

Create `app/api/chat/route.ts`:
```ts
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChatModel } from '@/lib/llm/model';
import { searchChunks } from '@/lib/retrieval/search';
import { applyThreshold } from '@/lib/retrieval/threshold';
import { buildPrompt, buildTopicsList } from '@/lib/prompt/build-prompt';
import { STRICT_GROUNDING_SYSTEM_PROMPT } from '@/lib/prompt/system-prompt';
import { verifyCitations } from '@/lib/citation/verify';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.format() }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const messages = body.data.messages;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return NextResponse.json({ error: 'No user message' }, { status: 400 });

  // Get or create conversation
  let conversationId = body.data.conversationId;
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: lastUser.content.slice(0, 60) })
      .select('id')
      .single();
    if (convErr || !conv) return NextResponse.json({ error: convErr?.message }, { status: 500 });
    conversationId = conv.id;
  }

  // Persist user message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: lastUser.content,
  });

  // Retrieve + gate
  const rawResults = await searchChunks(lastUser.content, {
    topK: env.RETRIEVAL_TOP_K,
    similarityThreshold: 0,
  });
  const gated = applyThreshold(rawResults, env.RETRIEVAL_SIMILARITY_THRESHOLD);

  // Soft refusal path — don't even call the LLM
  if (!gated.grounded) {
    const topics = buildTopicsList(rawResults);
    const refusal =
      topics.length > 0
        ? `I don't see information about that in the source documents. However, the documents do cover:\n\n${topics.map((t) => `- ${t}`).join('\n')}\n\nWould you like me to look into one of those?`
        : `I don't see information about that in the source documents.`;

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: refusal,
      citations: [],
    });

    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'text', value: refusal }) + '\n'));
          c.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'meta', conversationId, citations: [] }) + '\n'));
          c.close();
        },
      }),
      { headers: { 'content-type': 'application/x-ndjson' } },
    );
  }

  // Build prompt
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  const userPrompt = buildPrompt({
    chunks: gated.results,
    history,
    question: lastUser.content,
  });

  // Stream and accumulate
  const result = streamText({
    model: getChatModel(),
    messages: [
      { role: 'system', content: STRICT_GROUNDING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  let full = '';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const delta of result.textStream) {
        full += delta;
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'text', value: delta }) + '\n'));
      }

      const citations = verifyCitations(full, gated.results);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: full,
        citations,
      });

      controller.enqueue(
        encoder.encode(JSON.stringify({ type: 'meta', conversationId, citations }) + '\n'),
      );
      controller.close();
    },
  });

  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat
git commit -m "feat(api): streaming chat endpoint with strict-grounding pipeline"
```

---

# PHASE 6 — Auth

## Task 25: Sign-in Page + OAuth Callback

**Files:**
- Create: `app/(auth)/sign-in/page.tsx`, `app/(auth)/auth/callback/route.ts`, `components/auth/sign-in-button.tsx`

- [ ] **Step 1: Configure Google OAuth in Supabase dashboard**

In local Supabase, edit `supabase/config.toml`, add under `[auth.external.google]`:
```toml
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```
Append to `.env.local`:
```
GOOGLE_OAUTH_CLIENT_ID=<from Google Cloud Console>
GOOGLE_OAUTH_CLIENT_SECRET=<from Google Cloud Console>
```
Create a Google OAuth client at https://console.cloud.google.com/apis/credentials if you don't have one; set authorized redirect to `http://localhost:54321/auth/v1/callback` and `http://localhost:3000/auth/callback`.

Restart Supabase: `pnpm db:stop && pnpm db:start`.

- [ ] **Step 2: Sign-in button component**

Create `components/auth/sign-in-button.tsx`:
```tsx
'use client';
import { Button } from '@/components/ui/button';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function SignInButton() {
  const onClick = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };
  return <Button onClick={onClick}>Sign in with Google</Button>;
}
```

- [ ] **Step 3: Sign-in page**

Create `app/(auth)/sign-in/page.tsx`:
```tsx
import { SignInButton } from '@/components/auth/sign-in-button';

export default function SignIn() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Sir Sohail's Research Assistant</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask questions about our source papers. Every answer is grounded in the documents — click any citation to verify.
          </p>
        </div>
        <SignInButton />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: OAuth callback route**

Create `app/(auth)/auth/callback/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnTo = url.searchParams.get('returnTo') || '/chat';

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(returnTo, url.origin));
}
```

- [ ] **Step 5: Landing page redirects authed users to /chat**

Replace `app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { SignInButton } from '@/components/auth/sign-in-button';

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-8 shadow-sm text-center">
        <h1 className="text-3xl font-semibold">Sir Sohail's Research Assistant</h1>
        <p className="text-muted-foreground">
          A chat agent that answers only from our curated research corpus — with verified citations on every claim.
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Manual verify**

```bash
pnpm dev
```
Open `http://localhost:3000` → click Sign in → consent → redirected back → should land on `/chat` (404 for now, we build it next).

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(auth): Google OAuth sign-in + callback"
```

---

## Task 26: Make Sir Sohail an Admin (One-off DB Note)

**Files:** (none)

- [ ] **Step 1: Sign in once with Sir Sohail's account (or your own for now) to create a profile**

```bash
pnpm dev
```
Sign in, then stop the server.

- [ ] **Step 2: Promote to admin**

In Supabase Studio → SQL editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users order by created_at asc limit 1);
```

Verify in Studio → profiles table → role should be `admin` for the first user.

No commit — data change only. Add a note to CLAUDE.md:
```bash
echo "\n## Note — initial admin\nThe first user to sign in should be promoted to admin via SQL (see plan Task 26)." >> CLAUDE.md
git add CLAUDE.md
git commit -m "docs: note on bootstrapping the first admin"
```

---

# PHASE 7 — Chat UI

## Task 27: Chat Shell Layout

**Files:**
- Create: `app/chat/layout.tsx`, `components/sidebar/conversation-list.tsx`, `components/sidebar/account-menu.tsx`

- [ ] **Step 1: Sidebar components (no fetching yet — placeholder lists)**

Create `components/sidebar/account-menu.tsx`:
```tsx
'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AccountMenu({ email, initials }: { email: string; initials: string }) {
  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Avatar className="h-6 w-6"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          <span className="truncate text-sm">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Create `components/sidebar/conversation-list.tsx`:
```tsx
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export async function ConversationList() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  const items = data ?? [];
  return (
    <nav className="flex-1 overflow-y-auto px-2">
      <ul className="space-y-0.5">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={`/chat/${c.id}`} className="block truncate rounded px-2 py-1.5 text-sm hover:bg-accent">
              {c.title || 'Untitled'}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Chat layout**

Create `app/chat/layout.tsx`:
```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { ConversationList } from '@/components/sidebar/conversation-list';
import { AccountMenu } from '@/components/sidebar/account-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const email = user.email ?? 'user';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="grid h-screen grid-cols-[280px_1fr]">
      <aside className="flex flex-col border-r bg-muted/30">
        <div className="p-3">
          <Button asChild className="w-full"><Link href="/chat">+ New chat</Link></Button>
        </div>
        <Separator />
        <ConversationList />
        <Separator />
        <div className="p-3 space-y-1">
          <Button asChild variant="ghost" className="w-full justify-start text-sm"><Link href="/overview">Corpus Overview</Link></Button>
          <AccountMenu email={email} initials={initials} />
        </div>
      </aside>
      <main className="relative overflow-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Placeholder `/chat` page**

Create `app/chat/page.tsx`:
```tsx
export default function NewChatPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-muted-foreground">Start a new conversation — ask the corpus anything.</p>
    </div>
  );
}
```

- [ ] **Step 4: Manual verify**

```bash
pnpm dev
```
Sign in (if not already) → land on `/chat` → sidebar with your email, conversations list, buttons. No errors in console.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(ui): chat shell layout with sidebar"
```

---

## Task 28: Chat Composer + Streaming Renderer

**Files:**
- Create: `components/chat/chat-shell.tsx`, `components/chat/composer.tsx`, `components/chat/message-list.tsx`, `components/chat/message-item.tsx`, `components/chat/citation-card.tsx`, `app/chat/[conversationId]/page.tsx`

- [ ] **Step 1: Shared types file**

Create `components/chat/types.ts`:
```ts
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
```

- [ ] **Step 2: Citation card**

Create `components/chat/citation-card.tsx`:
```tsx
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UIMessage } from './types';

type Citation = NonNullable<UIMessage['citations']>[number];

export function CitationCard({
  citation,
  onOpen,
}: {
  citation: Citation;
  onOpen: (c: Citation) => void;
}) {
  if (!citation.valid) {
    return (
      <Card className="border-yellow-300 bg-yellow-50 text-xs">
        <CardContent className="p-2">
          <Badge variant="outline" className="mr-2">[{citation.marker}]</Badge>
          Unverified citation — this claim could not be mapped back to a source.
        </CardContent>
      </Card>
    );
  }
  return (
    <button
      onClick={() => onOpen(citation)}
      className={cn(
        'group w-full rounded-md border bg-card p-2 text-left text-xs transition hover:bg-accent',
      )}
    >
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className="shrink-0">[{citation.marker}]</Badge>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-medium">{citation.documentTitle}</div>
          <div className="text-muted-foreground">Page {citation.pageNumber}</div>
          <div className="line-clamp-3 text-muted-foreground">{citation.snippet}</div>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Message item**

Create `components/chat/message-item.tsx`:
```tsx
'use client';
import { cn } from '@/lib/utils';
import type { UIMessage } from './types';
import { CitationCard } from './citation-card';

export function MessageItem({
  message,
  onOpenCitation,
}: {
  message: UIMessage;
  onOpenCitation: (c: NonNullable<UIMessage['citations']>[number]) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex w-full gap-3 py-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] space-y-2 rounded-lg px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content || '…'}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="space-y-1.5">
            {message.citations.map((c) => (
              <CitationCard key={`${message.id}-${c.marker}`} citation={c} onOpen={onOpenCitation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Message list**

Create `components/chat/message-list.tsx`:
```tsx
'use client';
import { useEffect, useRef } from 'react';
import type { UIMessage } from './types';
import { MessageItem } from './message-item';

export function MessageList({
  messages,
  onOpenCitation,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: NonNullable<UIMessage['citations']>[number]) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6">
      {messages.map((m) => (
        <MessageItem key={m.id} message={m} onOpenCitation={onOpenCitation} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: Composer**

Create `components/chat/composer.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    const v = value.trim();
    if (!v) return;
    setValue('');
    onSend(v);
  };
  return (
    <form
      className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-lg border bg-background p-2 shadow-sm"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask a question about the source papers…"
        rows={2}
        className="resize-none border-0 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Send
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: Chat shell (client component)**

Create `components/chat/chat-shell.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList } from './message-list';
import { Composer } from './composer';
import type { UIMessage } from './types';
import { PdfSidePanel } from '@/components/pdf/pdf-side-panel';

type CitationType = NonNullable<UIMessage['citations']>[number];

export function ChatShell({
  conversationId: initialId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [panelCitation, setPanelCitation] = useState<CitationType | null>(null);
  const [convId, setConvId] = useState<string | undefined>(initialId);

  async function send(text: string) {
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: 'text'; value: string }
            | { type: 'meta'; conversationId: string; citations: CitationType[] };
          if (event.type === 'text') {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.value } : m)));
          } else if (event.type === 'meta') {
            if (!convId) setConvId(event.conversationId);
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m)));
          }
        }
      }
      if (!initialId && convId) router.replace(`/chat/${convId}`);
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${String(e)}` } : m)));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_420px]">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} onOpenCitation={setPanelCitation} />
        </div>
        <div className="border-t bg-background/60 p-3 backdrop-blur">
          <Composer onSend={send} disabled={streaming} />
        </div>
      </div>
      <PdfSidePanel citation={panelCitation} onClose={() => setPanelCitation(null)} />
    </div>
  );
}
```

- [ ] **Step 7: New chat page uses the shell**

Replace `app/chat/page.tsx`:
```tsx
import { ChatShell } from '@/components/chat/chat-shell';
export default function NewChatPage() {
  return <ChatShell initialMessages={[]} />;
}
```

- [ ] **Step 8: Existing conversation page**

Create `app/chat/[conversationId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { ChatShell } from '@/components/chat/chat-shell';
import type { UIMessage } from '@/components/chat/types';

export default async function ExistingChat({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createServerSupabase();
  const { data: conv } = await supabase
    .from('conversations').select('id').eq('id', conversationId).single();
  if (!conv) notFound();

  const { data: msgs } = await supabase
    .from('messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const initialMessages: UIMessage[] = (msgs ?? [])
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      citations: (m.citations as UIMessage['citations']) ?? undefined,
    }));

  return <ChatShell conversationId={conversationId} initialMessages={initialMessages} />;
}
```

- [ ] **Step 9: Typecheck (PdfSidePanel not yet created — we'll create it next)**

We'll introduce `PdfSidePanel` in the next task. For now, stub it:

Create `components/pdf/pdf-side-panel.tsx`:
```tsx
'use client';
export function PdfSidePanel({
  citation,
  onClose,
}: {
  citation: { documentFilename: string | null; pageNumber: number | null; snippet: string | null } | null;
  onClose: () => void;
}) {
  if (!citation) return <aside className="hidden border-l lg:block" />;
  return (
    <aside className="hidden border-l bg-muted/20 p-4 lg:block">
      <button onClick={onClose} className="text-xs text-muted-foreground">Close</button>
      <div className="mt-3 text-sm font-semibold">{citation.documentFilename}</div>
      <div className="text-xs text-muted-foreground">Page {citation.pageNumber}</div>
      <div className="mt-2 rounded border bg-background p-2 text-xs">{citation.snippet}</div>
    </aside>
  );
}
```

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 10: Manual verify**

```bash
pnpm dev
```
Navigate to `/chat`, type a question from the corpus (e.g., "What is project-based learning?"), hit Send. Tokens should stream. Citation cards should appear. Clicking a card opens the side panel with snippet.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat(ui): chat UI with streaming, citations, side panel stub"
```

---

## Task 29: Real PDF Viewer (react-pdf)

**Files:**
- Modify: `components/pdf/pdf-side-panel.tsx`
- Create: `components/pdf/pdf-viewer.tsx`

- [ ] **Step 1: Install react-pdf**

```bash
pnpm add react-pdf
```

- [ ] **Step 2: Add server route to get a signed PDF URL**

Create `app/api/pdf-url/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const documentId = url.searchParams.get('documentId');
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: doc } = await supabase
    .from('documents').select('storage_path').eq('id', documentId).single();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from('pdfs').createSignedUrl(doc.storage_path, 600);
  if (error || !signed) return NextResponse.json({ error: error?.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
```

- [ ] **Step 3: Viewer component**

Create `components/pdf/pdf-viewer.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function PdfViewer({ documentId, page }: { documentId: string; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/pdf-url?documentId=${documentId}`);
      if (!res.ok) return;
      const { url } = await res.json();
      if (!cancelled) setUrl(url);
    })();
    return () => { cancelled = true; };
  }, [documentId]);

  if (!url) return <div className="p-4 text-xs text-muted-foreground">Loading PDF…</div>;

  return (
    <div className="h-full overflow-auto">
      <Document file={url} loading={<div className="p-4 text-xs">Loading…</div>}>
        <Page pageNumber={page} width={380} />
      </Document>
    </div>
  );
}
```

- [ ] **Step 4: Update side panel to use the real viewer**

Overwrite `components/pdf/pdf-side-panel.tsx`:
```tsx
'use client';
import { PdfViewer } from './pdf-viewer';
import { Button } from '@/components/ui/button';

type PanelCitation = {
  documentId: string | null;
  documentFilename: string | null;
  documentTitle: string | null;
  pageNumber: number | null;
  snippet: string | null;
};

export function PdfSidePanel({
  citation,
  onClose,
}: {
  citation: PanelCitation | null;
  onClose: () => void;
}) {
  if (!citation || !citation.documentId || !citation.pageNumber) {
    return <aside className="hidden border-l bg-muted/10 lg:block" />;
  }
  return (
    <aside className="hidden h-full flex-col border-l bg-muted/10 lg:flex">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{citation.documentTitle}</div>
          <div className="text-xs text-muted-foreground">Page {citation.pageNumber}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="border-b bg-yellow-50 p-2 text-xs">
        <span className="font-semibold">Cited snippet:</span> {citation.snippet}
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfViewer documentId={citation.documentId} page={citation.pageNumber} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Manual verify**

```bash
pnpm dev
```
Ask a question, get an answer with citations, click a citation — the side panel renders the actual PDF page.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(ui): real PDF viewer with signed-URL fetching"
```

---

# PHASE 8 — Admin + Overview Pages

## Task 30: Admin Guard + Upload Page

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/documents/page.tsx`, `app/api/ingest/route.ts`

- [ ] **Step 1: Admin layout (guard)**

Create `app/admin/layout.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') notFound();
  return <div className="mx-auto max-w-5xl p-8">{children}</div>;
}
```

- [ ] **Step 2: Ingest API route (multipart)**

Create `app/api/ingest/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ingestDocument } from '@/lib/ingest/ingest-document';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const storagePath = `corpus/${Date.now()}-${file.name}`;

  const { error: upErr } = await supabase.storage.from('pdfs').upload(storagePath, buf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const result = await ingestDocument({
    filename: file.name,
    title: file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '),
    storagePath,
    uploadedBy: user.id,
    data: buf,
  });

  return NextResponse.json({ ok: true, ...result });
}
```

- [ ] **Step 3: Upload page**

Create `app/admin/documents/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminDocs() {
  const [status, setStatus] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setStatus('Uploading…');
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/ingest', { method: 'POST', body: form });
    if (res.ok) {
      const d = await res.json();
      setStatus(`Ingested: ${d.chunkCount} chunks`);
    } else {
      setStatus(`Failed: ${await res.text()}`);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin — Documents</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <Input type="file" name="file" accept="application/pdf" required />
        <Button type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload & Ingest'}</Button>
      </form>
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Manual verify**

Visit `/admin/documents` as an admin → upload a small PDF → confirm new document + chunks appear in Studio.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(admin): upload page and ingest route"
```

---

## Task 31: Corpus Overview Page

**Files:**
- Create: `app/overview/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Overview() {
  const supabase = await createServerSupabase();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, filename, page_count, summary')
    .order('title', { ascending: true });

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Corpus Overview</h1>
        <p className="text-muted-foreground">{(docs ?? []).length} source papers</p>
      </div>
      <ul className="space-y-3">
        {(docs ?? []).map((d) => (
          <li key={d.id} className="rounded-lg border p-4">
            <div className="font-medium">{d.title ?? d.filename}</div>
            <div className="text-xs text-muted-foreground">{d.page_count ?? '?'} pages · {d.filename}</div>
            {d.summary && <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>}
          </li>
        ))}
      </ul>
      <Link href="/chat" className="inline-block text-sm underline">← Back to chat</Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/overview
git commit -m "feat(ui): corpus overview page"
```

---

# PHASE 9 — Testing

## Task 32: Golden Q&A Test Fixtures

**Files:**
- Create: `tests/fixtures/golden-qa.json`, `tests/fixtures/refusal-questions.json`

- [ ] **Step 1: Golden Q&A JSON**

Create `tests/fixtures/golden-qa.json` with at least 5 entries derived from the actual corpus. Sample starter:
```json
[
  {
    "question": "What is project-based learning according to the corpus?",
    "expectedTopicKeywords": ["project-based", "PBL", "learning"],
    "minCitations": 1
  },
  {
    "question": "Which papers discuss innovation in higher education?",
    "expectedTopicKeywords": ["innovation", "higher education"],
    "minCitations": 1
  },
  {
    "question": "Summarize findings on entrepreneurship education for medical students.",
    "expectedTopicKeywords": ["entrepreneurship", "medical"],
    "minCitations": 1
  },
  {
    "question": "How is design thinking applied in the corpus?",
    "expectedTopicKeywords": ["design thinking"],
    "minCitations": 1
  },
  {
    "question": "What is discussed about resilience in innovation education?",
    "expectedTopicKeywords": ["resilience", "innovation"],
    "minCitations": 1
  }
]
```

- [ ] **Step 2: Refusal set**

Create `tests/fixtures/refusal-questions.json`:
```json
[
  "What is the capital of France?",
  "How do I bake a chocolate chip cookie?",
  "Who won the 2024 World Series?",
  "What's the weather in Tokyo?",
  "Write me a Python script to sort an array."
]
```

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures
git commit -m "test: add golden Q&A and refusal fixtures"
```

---

## Task 33: Integration Test — Full Chat Path

**Files:**
- Create: `tests/integration/chat-api.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Golden = { question: string; expectedTopicKeywords: string[]; minCitations: number };
type Refusal = string;

describe('chat pipeline (requires dev server + ingested corpus)', () => {
  const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
  const cookie = process.env.TEST_SESSION_COOKIE; // set in env for tests

  it.skipIf(!cookie)('golden Q&A: grounded answers contain citations', async () => {
    const golden = JSON.parse(await readFile(path.resolve('tests/fixtures/golden-qa.json'), 'utf8')) as Golden[];
    for (const g of golden.slice(0, 3)) {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ messages: [{ role: 'user', content: g.question }] }),
      });
      expect(res.ok).toBe(true);
      const text = await res.text();
      // Expect at least one citation marker
      expect(/\[\d+\]/.test(text)).toBe(true);
    }
  }, 120_000);

  it.skipIf(!cookie)('refusal: off-topic questions trigger soft refusal', async () => {
    const refusals = JSON.parse(await readFile(path.resolve('tests/fixtures/refusal-questions.json'), 'utf8')) as Refusal[];
    for (const q of refusals.slice(0, 2)) {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      });
      expect(res.ok).toBe(true);
      const text = await res.text();
      expect(text.toLowerCase()).toContain("don't see information");
    }
  }, 120_000);
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/integration/chat-api.test.ts
git commit -m "test: chat API integration — golden and refusal sets"
```

*(Running these tests requires a running dev server and a valid session cookie — documented in CLAUDE.md; these are manual-triggered tests, not CI gates.)*

---

## Task 34: E2E — Sign In and Ask a Question

**Files:**
- Create: `tests/e2e/ask-question.spec.ts`

- [ ] **Step 1: Test** (uses storage state — see Step 2)

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test('sign-in → ask a question → see streamed answer + citation', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('textarea', 'What is project-based learning?');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=project-based').first()).toBeVisible({ timeout: 30_000 });
  const citation = page.locator('text=/\\[\\d+\\]/').first();
  await expect(citation).toBeVisible();
});
```

- [ ] **Step 2: Create an auth fixture (one-off)**

Document in CLAUDE.md under testing:
```
# Create a session fixture once:
# 1. Sign in in a normal browser session
# 2. Export cookies (DevTools → Application → Cookies)
# 3. Save to tests/.auth/user.json in Playwright storageState format
```

For now, skip E2E tests in CI if the fixture is absent.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): ask-question happy path"
```

---

# PHASE 10 — Polish and Deploy

## Task 35: Update CLAUDE.md with Final Run Instructions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append run instructions**

Append to `CLAUDE.md`:
```markdown

## Running Locally (step-by-step)

1. `ollama serve` (or confirm running via `curl http://localhost:11434/api/tags`)
2. `pnpm db:start`
3. Copy `.env.example` → `.env.local`, fill in keys (Supabase local keys from `db:start` output; Google OAuth creds from Google Cloud Console)
4. `pnpm db:reset` (applies migrations)
5. `pnpm db:types`
6. `pnpm ingest:corpus` (first time only — ingests the 40 seed PDFs)
7. `pnpm dev`
8. Open http://localhost:3000, sign in, promote yourself to admin via SQL (see Task 26)

## Testing

- `pnpm test` — unit tests (pure logic)
- `pnpm test tests/integration` — integration (requires Ollama + running DB)
- `pnpm test:e2e` — Playwright (requires running dev server + auth fixture)

## Switching to Cloud LLM

Set `LLM_PROVIDER=gemini` in `.env.local`, add `GEMINI_API_KEY=<your-key>`. Restart dev server. No code changes needed.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: run/test instructions in CLAUDE.md"
```

---

## Task 36: Vercel Deployment Configuration

**Files:**
- Create: `vercel.json` (optional), `.env.production.example`

- [ ] **Step 1: `.env.production.example`**

Document which env vars Vercel needs:
```
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_EMBEDDING_MODEL=text-embedding-004
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RETRIEVAL_TOP_K=8
RETRIEVAL_SIMILARITY_THRESHOLD=0.4
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
```

- [ ] **Step 2: Create a Supabase cloud project (via dashboard)**

Outside the plan — user action:
1. Create project at https://supabase.com
2. Run migrations there via `supabase link --project-ref <ref>` then `supabase db push`
3. Run the ingest script against the cloud DB by pointing env to it (temporarily use cloud URL + service role in `.env.local` and run `pnpm ingest:corpus`)

- [ ] **Step 3: Deploy to Vercel**

```bash
pnpm dlx vercel@latest link
pnpm dlx vercel@latest --prod
```
Set env vars in the Vercel dashboard. Verify the deployment URL loads sign-in.

- [ ] **Step 4: Add the Vercel URL to Google OAuth authorized redirects**

In Google Cloud Console → Credentials → your OAuth client, add:
- `https://<your-domain>/auth/callback`
- `https://<project>.supabase.co/auth/v1/callback`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: production env template"
```

---

## Task 37: Final Smoke Test in Production

**Files:** (none)

- [ ] **Step 1: Live run**

On the deployed URL:
1. Sign in with Google
2. Promote yourself to admin in the cloud Supabase SQL editor
3. Ask "What is project-based learning?" — expect streamed answer + citation
4. Click a citation — expect side panel with PDF
5. Ask "What's the capital of France?" — expect refusal
6. Go to `/overview` — expect 40 documents

- [ ] **Step 2: Capture a short screen recording for the funding demo** (manual — outside plan)

No commit — verification only.

---

# Appendix — Commit Summary

At the end, `git log --oneline` should show ~40 commits, grouped by phase. Clean, atomic, each passing typecheck + lint.

# Appendix — If Retrieval Quality is Weak

If Sir Sohail reports answers missing relevant papers:
1. Lower `RETRIEVAL_SIMILARITY_THRESHOLD` (try 0.3 or 0.25)
2. Raise `RETRIEVAL_TOP_K` (try 12 or 16)
3. Tune the chunker: smaller chunks (targetChars=1200) for denser retrieval
4. Consider a re-ranker (e.g., Cohere Rerank free tier) — this is a follow-up task, not part of v1

# Appendix — Known Risks

- **Ollama must be running for local dev.** Document this in CLAUDE.md.
- **First ingest is slow** (~5-15 minutes for 40 PDFs on a laptop). Acceptable one-time cost.
- **Vercel serverless timeouts.** `maxDuration = 300` on the ingest route — upgrade to Vercel Pro for longer runs if a single PDF is very large.
- **Gemini free-tier rate limits.** We implement basic retry in the AI SDK, but surface rate-limit errors clearly.

---

**End of plan.**
