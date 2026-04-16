# PDF-Grounded Research Agent — Design Spec

- **Project owner:** Prof. Sohail (Eastern Michigan University)
- **Built by:** Ibrahim Samad
- **Date:** 2026-04-16
- **Status:** Design approved, awaiting written-spec review
- **Codename:** `pdf-agent` (working name — final name TBD with Sir Sohail)

---

## 1. Vision and Context

Prof. Sohail teaches at Eastern Michigan University and curates a corpus of ~40 academic papers spanning innovation education, entrepreneurship education, project-based learning, design thinking, and higher-education pedagogy. He wants a chat-style web tool — similar to ChatGPT or Claude in feel — that lets his students ask questions and get reliable, cited answers **drawn exclusively from those papers**.

The tool's defining property is **strict grounding**: the agent must never answer from the underlying model's general knowledge or from any external source. If an answer is not in the provided PDFs, the agent says so and suggests related topics that *are* covered. Every answer that is produced must include explicit citations — paper name, page number, and the exact quoted snippet — with a clickable citation that opens the PDF to the correct page in a side panel.

The project has a potential funding pathway. If the classroom pilot succeeds, the tool will be shown to funders as a scalable research-assistant platform. The user experience and architecture therefore need to look production-grade, not like a research prototype.

---

## 2. Goals and Non-Goals

### Goals

1. Deliver a polished, ChatGPT-style chat interface for asking natural-language questions about the PDF corpus.
2. Enforce strict grounding: every claim in an answer must be backed by an excerpt from a specific page of a specific PDF.
3. Always cite sources with paper name + page + quoted snippet + clickable link that opens the PDF at the correct page.
4. When a question is not answerable from the PDFs, decline gracefully and suggest related topics that are covered.
5. Support a "corpus overview" capability — tell the user what's in the documents so they know what to ask.
6. Authenticate users (Sir Sohail + his students) so access is controlled and conversations are per-user.
7. Run end-to-end free during the demo phase; scale to paid hosting only if usage grows post-funding.
8. Keep every major component swappable (LLM provider, DB, hosting) so the system can migrate to EMU infrastructure or a chosen cloud post-funding without a rewrite.

### Non-Goals (explicitly out of scope for v1)

- Writing new content from scratch (essays, papers) beyond what the source PDFs support.
- Answering general-knowledge questions from the base model.
- Web search integration.
- Generating citations in a specific academic style (APA, MLA) — plain paper + page is sufficient for v1.
- Fine-tuning or training a custom LLM — we use off-the-shelf Gemma 4 and build the agent wrapper around it.
- Mobile native apps — responsive web only.
- Real-time collaborative chat (multiple users in one conversation).
- Admin analytics dashboard — deferred to post-funding.

---

## 3. Primary Users

| Role | Needs | Access |
|---|---|---|
| **Sir Sohail (professor)** | Upload/manage PDFs, ask research questions, show demo to funders | Full access (admin) |
| **Students (EMU)** | Ask questions, read citations, open source PDFs | Read + chat access only |
| **Funders (visitors)** | See a clean demo, verify claims by clicking citations | Read-only guest mode (post-MVP — see §15) |

---

## 4. Core Behavior — The Strict-Grounding Contract

### 4.1 Answering rules

Every agent response falls into one of three cases:

1. **Answered from PDFs** — answer rephrases/summarizes retrieved chunks from the PDFs. Must include 1-N citations. Each citation links to a specific page of a specific PDF and includes the exact quoted snippet.
2. **Not in PDFs (soft refusal)** — when retrieval finds no relevant chunks above a similarity threshold, the agent responds: *"I don't see information about that in the source documents. However, the documents do cover: [list of related topics detected from metadata]. Would you like me to look into one of those?"*
3. **Corpus overview** — when the user asks "what's in the documents" or similar, the agent returns a concise summary of the corpus (paper titles + one-line descriptions + main topics).

### 4.2 What the agent MUST NOT do

- Answer from the base LLM's general knowledge.
- Invent citations or cite pages that don't contain the quoted text.
- Speculate, extrapolate, or synthesize claims not supported by a retrieved chunk.
- Search the web or hit any external knowledge API.

### 4.3 Enforcement mechanisms

Strict grounding is enforced by **three independent safeguards**:

1. **System prompt discipline** — a carefully worded system prompt that instructs the model to refuse when context is absent and to quote directly from context.
2. **Retrieval threshold** — if top-K retrieved chunks all score below a similarity floor, skip the LLM entirely and return the soft refusal directly.
3. **Citation verification** — after the model generates an answer with citations, verify that each claimed quote actually exists on the claimed page. If not, mark the citation invalid and surface a warning.

---

## 5. User Experience

### 5.1 Layout (ChatGPT/Claude-inspired)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Sidebar]            [Main Chat Area]          [PDF Preview]    │
│                                                                  │
│  + New Chat          User: What does paper 3 say about PBL?      │
│  - Prior Chat 1      Agent: PBL is described as... [1][2]        │
│  - Prior Chat 2                                                  │
│  - Prior Chat 3      User: Show me more                          │
│                                                                  │
│  [Corpus Overview]   Agent: ...                                  │
│  [Sources (40)]                                                  │
│  [Account]                                                       │
└──────────────────────────────────────────────────────────────────┘
```

- **Left sidebar:** conversation list (per user), "new chat" button, link to corpus overview, link to source list, account menu.
- **Main area:** streaming chat messages with inline citation markers `[1]`, `[2]`. Citations appear as footnote-style cards below each agent message, each showing paper title, page, and the quoted snippet.
- **Right panel:** PDF viewer that opens when a citation is clicked, jumps to the correct page, and highlights the quoted snippet.
- **Responsive:** on mobile, the PDF preview opens as a bottom sheet; sidebar collapses.

### 5.2 Onboarding

- Landing page explains the tool in one paragraph + single "Sign in with Google" button.
- First-time users see a short guided tour: "Ask anything about our research corpus. I can only answer from 40 source papers — click any citation to verify."

### 5.3 Agent personality

- Professional, neutral academic tone.
- Always prefaces refusals with a gentle framing rather than a blunt "no."
- Defaults to concise answers with bullet points when appropriate.
- Offers follow-up suggestions after each answer ("Want to dig into the methodology on this?").

---

## 6. Architecture

### 6.1 High-level diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (Next.js client)                   │
│   Chat UI (shadcn/ui) │ PDF viewer (react-pdf) │ Auth client    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴────────────────────────────────────┐
│              Next.js 16 Server (App Router, RSC)                │
│   ┌───────────────────────────────────────────────────────┐     │
│   │  API Routes / Server Actions                          │     │
│   │   - /api/chat (streaming, Vercel AI SDK)              │     │
│   │   - /api/ingest (PDF upload + processing)             │     │
│   │   - /api/conversations (CRUD)                         │     │
│   │   - /api/overview (corpus summary)                    │     │
│   └───────────────────────────────────────────────────────┘     │
│                             │                                   │
│   ┌─────────────┐  ┌────────┴────────┐  ┌──────────────────┐    │
│   │ Retrieval   │  │ Strict-grounded │  │ Citation verify  │    │
│   │ (pgvector)  │  │ prompt builder  │  │ (quote matcher)  │    │
│   └──────┬──────┘  └────────┬────────┘  └────────┬─────────┘    │
└──────────┼──────────────────┼────────────────────┼──────────────┘
           │                  │                    │
    ┌──────┴──────┐   ┌───────┴──────┐     ┌───────┴──────┐
    │  Supabase   │   │  LLM         │     │ Chunk store  │
    │  (Postgres  │   │  (Ollama or  │     │ (part of     │
    │   + pgvec   │   │   Gemini)    │     │  Supabase)   │
    │   + Auth    │   │              │     │              │
    │   + Storage)│   │              │     │              │
    └─────────────┘   └──────────────┘     └──────────────┘
```

### 6.2 Component responsibilities

| Component | Responsibility |
|---|---|
| **Browser (Next.js client)** | Render chat UI, stream messages, display citations, render PDF viewer, handle auth UI. |
| **Chat API route** | Receive user question, call retrieval, build prompt, stream LLM response, post-verify citations, persist to DB. |
| **Ingest API route** | Handle PDF uploads, parse, chunk, embed, store. Gated to admin role (Sir Sohail only). |
| **Retrieval module** | Query embedding → pgvector similarity search → return top-K chunks with scores + metadata. |
| **Prompt builder** | Assemble system prompt + retrieved chunks + conversation history into a strict-grounding prompt. |
| **Citation verifier** | Post-process model output: extract claimed quotes, confirm each exists on the claimed page, annotate. |
| **LLM provider** | Abstract interface; concrete implementations for Ollama (local) and Google Gemini (cloud). |
| **Supabase** | Postgres for app data, pgvector for embeddings, Auth for login, Storage for PDF files. |

### 6.3 Data flow — ingestion (PDF upload)

1. Sir Sohail uploads a PDF in the admin area.
2. PDF saved to Supabase Storage; row created in `documents` table.
3. Server parses PDF with `unpdf`, producing per-page text.
4. Each page split into overlapping chunks (~500 tokens, ~50-token overlap).
5. For each chunk: call `nomic-embed-text` via Ollama to get a 768-dim vector.
6. Chunks stored in `chunks` table with page number, content, embedding, chunk index.
7. Document-level summary generated (one sentence via the LLM from the first page) and stored in `documents.summary`.

### 6.4 Data flow — question answering

1. User types a question in the chat UI.
2. Client sends question to `/api/chat` (streams response via Vercel AI SDK).
3. Server embeds the question with `nomic-embed-text`.
4. pgvector similarity search returns top-K chunks (K = 8 by default). Scores tracked.
5. **Threshold gate:** if all top-K scores fall below the refusal threshold (e.g., 0.4 cosine similarity), skip LLM — stream back the soft-refusal message with corpus-topic suggestions.
6. Otherwise, build a prompt: system rules + retrieved chunks (with `[source: paper X, page Y]` markers) + conversation history + user question.
7. Call Gemma 4 E4B (via Ollama) or Gemini (cloud). Stream tokens to client.
8. As tokens arrive, client renders them; in parallel, server buffers the full response.
9. On completion, server extracts citations from the response, verifies each against the source chunk, and returns the final citation metadata.
10. Client renders citation cards below the message. Clicking a citation opens the PDF side panel to the correct page with the quoted snippet highlighted.
11. Message + citations + chunk IDs persisted to the `messages` table.

### 6.5 Data flow — corpus overview

1. User asks "what's in the documents" or clicks the Corpus Overview button.
2. Server returns a pre-built summary rendered from the `documents` table: list of papers grouped by topic with one-line summaries.
3. If user clicks a paper, full metadata + abstract (first page) is shown in the PDF side panel.

---

## 7. Data Model (Supabase / Postgres)

```sql
-- Auth tables managed by Supabase Auth (auth.users)

-- Profile extension
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  role text check (role in ('admin','student','guest')) default 'student',
  created_at timestamptz default now()
);

-- Source documents (the PDFs)
create table documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  title text,
  summary text,
  storage_path text not null,      -- path in Supabase Storage
  page_count int,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

-- Chunks + embeddings
create extension if not exists vector;

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  page_number int not null,
  chunk_index int not null,        -- order within the page
  content text not null,
  embedding vector(768),
  token_count int,
  created_at timestamptz default now()
);

create index chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user','assistant','system')) not null,
  content text not null,
  citations jsonb,                 -- [{chunk_id, document_id, page, snippet, verified}]
  created_at timestamptz default now()
);

-- Row-level security
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
-- (documents + chunks readable by all authenticated users; writable only by admins)
```

---

## 8. Strict-Grounding Prompt (v1)

The exact system prompt is a first-class design artifact and will be tuned during testing. Draft:

```
You are the research assistant for Prof. Sohail's document corpus.

RULES:
1. Answer ONLY from the CONTEXT provided below. Never use your own
   knowledge, never search the web, never speculate.
2. If the CONTEXT does not contain the answer, say:
   "I don't see information about that in the source documents.
    However, the documents do cover: [list relevant topics from context].
    Would you like me to look into one of those?"
3. Every factual claim must be followed by a citation marker [1], [2], etc.
   Citations MUST correspond to the numbered sources in the CONTEXT.
4. When quoting, use the exact wording from the CONTEXT.
5. Do not invent paper titles, authors, or page numbers.

CONTEXT:
[1] (Title: {title_1}, Page: {page_1})
{chunk_1_content}

[2] (Title: {title_2}, Page: {page_2})
{chunk_2_content}

...

CONVERSATION HISTORY:
{history}

USER QUESTION: {question}
```

---

## 9. Technical Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Cache Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| AI layer | Vercel AI SDK |
| LLM (local) | Ollama — `gemma4:e4b` |
| LLM (cloud fallback) | Google Gemini (free tier) |
| Embeddings | Ollama — `nomic-embed-text` |
| PDF parsing | `unpdf` |
| PDF viewing | `react-pdf` |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth (Google OAuth) |
| File storage | Supabase Storage |
| Deployment | Vercel (Hobby → Pro) |
| Package manager | pnpm |
| Linter/formatter | Biome |
| Testing | Vitest (unit) + Playwright (E2E) |

### Environment variables (v1)

```
# LLM provider switch
LLM_PROVIDER=ollama            # or "gemini"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Retrieval tuning
RETRIEVAL_TOP_K=8
RETRIEVAL_SIMILARITY_THRESHOLD=0.4
```

---

## 10. Error Handling

| Failure | Behavior |
|---|---|
| LLM unreachable (Ollama down, Gemini error) | Show friendly error; suggest retry; log server-side. |
| Embedding model unreachable | Same as above for the ingest and query paths. |
| PDF parse failure during upload | Mark document as `failed`, show the admin the error; leave prior documents untouched. |
| Vector search returns no results / all below threshold | Trigger soft-refusal path (Section 4). |
| Citation verification fails (quote not found on claimed page) | Answer still streams, but the failed citation is flagged in the UI with a ⚠️ and the admin is logged. |
| Auth failure | Redirect to sign-in; preserve current URL as `returnTo`. |
| Rate limits (Gemini free tier) | Exponential backoff with user-visible "busy, retrying..." state. |

---

## 11. Security and Privacy

- All routes (except landing and sign-in) require an authenticated session.
- Supabase Row-Level Security on `profiles`, `conversations`, `messages` so users see only their own data.
- Admin role required for ingest / document management routes.
- PDF storage bucket served via signed URLs with short TTL.
- No PII collected beyond what Google OAuth returns (name, email, avatar).
- Chat data stays in Supabase; when using cloud Gemini, questions + retrieved context are sent to Google per their terms. When using local Ollama, nothing leaves the machine.
- Environment secrets never exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only.

---

## 12. Testing Strategy

### 12.1 Unit tests (Vitest)
- Chunker: correct token counts, overlap behavior, edge cases (tiny/giant pages).
- Embedder: deterministic output for fixed input.
- Prompt builder: correct interpolation, no leakage of system rules into user turns.
- Citation verifier: correctly flags fake quotes.

### 12.2 Integration tests
- Ingest pipeline: upload a known PDF, verify chunks + embeddings exist in DB.
- Query pipeline: known question → known chunk retrieved at top-1.

### 12.3 Golden Q&A set
Curate ~30 question/answer pairs drawn directly from the corpus. For each, verify:
- The agent's answer is grounded in the expected source chunk.
- The citation points to the correct paper + page.

### 12.4 Refusal tests
Curate ~10 questions that the corpus does NOT cover (e.g., "What's the capital of France?", "How do I bake a cake?"). For each, verify:
- The agent produces the soft-refusal message.
- No invented citations.
- Related topics (when surfaced) come from actual corpus metadata.

### 12.5 End-to-end (Playwright)
- Sign in → new chat → ask question → citation renders → click citation → PDF opens to correct page.

---

## 13. Build Sequence (high level — detailed steps come in the implementation plan)

1. **Project scaffold** — Next.js 16 + TypeScript + Tailwind + shadcn/ui + Biome.
2. **Supabase setup** — project, tables, RLS, storage buckets, auth providers.
3. **Ollama verified locally** — Gemma 4 E4B + nomic-embed-text both responding.
4. **Ingest pipeline** — CLI script first: parse → chunk → embed → store for the 40 existing PDFs.
5. **Retrieval module** — pgvector similarity search with threshold gate.
6. **Prompt builder + LLM provider abstraction** — Ollama adapter + Gemini adapter behind one interface.
7. **Chat API route** — streaming via Vercel AI SDK.
8. **Citation verifier** — post-processing step.
9. **Chat UI** — shadcn/ui chat shell, streaming rendering, citation cards.
10. **PDF side panel** — react-pdf viewer with page jump + highlight.
11. **Auth + user conversations** — sign in, conversation list, per-user persistence.
12. **Admin upload UI** — so Sir Sohail can add new PDFs via the web.
13. **Corpus overview view** — list of all PDFs grouped by topic.
14. **Testing** — golden Q&A set, refusal tests, E2E.
15. **Deployment** — Vercel + Supabase prod, environment hardening, final polish.

---

## 14. Deployment Strategy

### 14.1 Development (now)
- Ollama running on the developer laptop.
- Next.js dev server (`pnpm dev`).
- Supabase local stack via the Supabase CLI (or dev cloud project).

### 14.2 Classroom / funding demo
- Deploy the web app to **Vercel** (free Hobby tier for the demo).
- Run Supabase on its **free tier** (sufficient for early usage).
- Use **Gemini free tier** for LLM calls in production (Ollama can't be reached from Vercel cloud; local Ollama is dev-only).
- Domain: a subdomain like `sohail-agent.vercel.app` initially; custom domain post-funding.

### 14.3 Post-funding scale
- Vercel Pro plan (~$20/month) when traffic grows.
- Supabase Pro plan (~$25/month) when DB limits approach.
- Option to self-host the Next.js app on EMU servers (standard Node.js deploy).
- Option to migrate DB to managed Postgres elsewhere (AWS RDS, DigitalOcean, EMU servers).
- Option to bring back Ollama on a dedicated GPU server for privacy-sensitive deployments.

---

## 15. Open Questions for Sir Sohail (before implementation)

These are clarifying questions for the professor — they do NOT block the implementation plan, but should be resolved during the first build iteration:

1. **Final corpus?** Are the 40 existing PDFs the full set for launch, or will more be added? (System already supports adding more, but we should know for the demo.)
2. **Agent name/branding?** "Sir Sohail's Research Assistant"? Something else?
3. **Student access control?** Do we require an EMU email domain (`@emich.edu`) for sign-in, or is any Google account fine during pilot?
4. **Public or private demo for funders?** Funders may need a guest link without full sign-up.

---

## 16. Success Criteria

- A student can sign in, ask a natural-language question, get a clear cited answer in under 10 seconds.
- Every answer has at least one verified citation that, when clicked, opens the PDF at the correct page with the quoted passage highlighted.
- Out-of-scope questions trigger the soft-refusal flow 100% of the time in the refusal-test set.
- Zero invented citations in the golden Q&A evaluation.
- Sir Sohail can add a new PDF through the admin UI and it is queryable within one minute.
- The entire v1 runs on free tiers during the pilot.
- Funding demo: a non-technical reviewer can use the tool unaided on a phone and understand that every claim is traceable.
