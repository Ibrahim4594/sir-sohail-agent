# CLAUDE.md — project context for AI assistants

This file is read first by AI assistants working in this repo. Keep it current.

## Project: PDF-Grounded Research Agent (`pdf-agent`)

A chat-style web tool that lets Prof. Sohail (Eastern Michigan University) and his students ask natural-language questions about a corpus of ~40 academic PDFs. The agent **answers only from the PDFs** — never from general knowledge, never from the web. Every answer cites its source(s).

Project has funding-demo potential — **treat it as a product, not a prototype**.

Full spec: [`docs/superpowers/specs/2026-04-16-pdf-agent-design.md`](docs/superpowers/specs/2026-04-16-pdf-agent-design.md).

## The One Non-Negotiable Rule

**Strict grounding.** The agent must never answer from the base LLM's own knowledge. If retrieval returns nothing relevant, the agent refuses with a soft message and lists related topics the corpus *does* cover. Every claim is backed by a verified citation (paper + page + exact quote). Three safeguards enforce this:

1. System-prompt discipline
2. Retrieval similarity threshold (skip the LLM entirely if no chunk clears the bar)
3. Post-generation citation verification (reject hallucinated quotes)

Any change that weakens any of these three safeguards needs explicit approval.

## Tech Stack (locked)

- **Framework:** Next.js 16 (App Router, Server Components, Cache Components)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI:** shadcn/ui
- **AI layer:** Vercel AI SDK
- **LLM (local/dev):** Ollama — `gemma4:e4b`
- **LLM (cloud/prod):** Google Gemini free tier — `gemini-flash-latest`
- **Embeddings:** Ollama — `nomic-embed-text`
- **PDF parsing:** `unpdf`
- **PDF viewing:** `react-pdf`
- **Database:** Supabase (Postgres + pgvector)
- **Auth:** Supabase Auth (Google OAuth)
- **File storage:** Supabase Storage
- **Deployment:** Vercel
- **Package manager:** pnpm
- **Linter/formatter:** Biome
- **Testing:** Vitest (unit) + Playwright (E2E)

## Key Architectural Decisions

- **LLM is pluggable.** Ollama and Gemini both sit behind a single `LLMProvider` interface. Changing provider = changing one env var. Do not hardcode calls to either.
- **Vector DB is pgvector in Supabase.** Not Pinecone, not Chroma, not LanceDB. One service handles DB + auth + storage + vector.
- **Ingestion runs server-side only.** PDFs never leave the server to be parsed. Parsing + chunking + embedding all happen in Next.js server actions or a standalone CLI script.
- **Chunk size is ~500 tokens with ~50-token overlap.** Tuned later if retrieval quality is weak.
- **Retrieval top-K = 8, similarity threshold = 0.4 cosine.** Env-configurable. If all top-K are below threshold, skip the LLM entirely and return the soft-refusal.
- **Citations verified post-generation.** Extract claimed quotes, check each against the source chunk. Fail loudly if a citation is bogus.

## Repo Layout (expected once scaffolded)

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # sign-in flows
│   ├── chat/                   # chat UI
│   ├── admin/                  # PDF management (admin only)
│   ├── overview/               # corpus overview
│   └── api/
│       ├── chat/               # streaming chat endpoint
│       ├── ingest/             # PDF upload/processing
│       └── conversations/      # CRUD
├── components/                 # shadcn/ui + custom components
├── lib/
│   ├── llm/                    # provider abstraction + adapters
│   ├── retrieval/              # embedding + similarity search + threshold
│   ├── prompt/                 # strict-grounding prompt builder
│   ├── citation/               # extraction + verification
│   ├── ingest/                 # parse → chunk → embed
│   └── supabase/               # client + server helpers
├── scripts/
│   └── ingest-corpus.ts        # one-off: ingest the 40 seed PDFs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── public/
├── pdfs/                       # the 40 seed PDFs (NOT committed in prod — stored via Supabase Storage)
└── supabase/                   # migrations, RLS policies, seed
```

## Local Development

Expected (will be locked in during scaffold):

```
pnpm install
pnpm supabase:start        # starts local Supabase stack
pnpm db:migrate            # apply migrations
ollama pull gemma4:e4b     # one-time
ollama pull nomic-embed-text  # one-time
pnpm ingest:corpus         # one-time: ingest the 40 PDFs
pnpm dev                   # start Next.js dev server
```

## Conventions

- **TypeScript strict.** No `any` unless commented why.
- **Server-side secrets only.** `SUPABASE_SERVICE_ROLE_KEY` must never appear in client code.
- **One concern per file.** When a file grows past ~250 lines, consider splitting.
- **Tests live next to the code** for units (`foo.ts` + `foo.test.ts`), in `tests/` for integration and E2E.
- **No speculative abstraction.** Three similar lines beat a premature helper.
- **No comments explaining what code does.** Only comments explaining *why* something is non-obvious.
- **Use the LLM provider abstraction for all LLM calls.** Never call `fetch('http://localhost:11434/...')` directly from a feature file.

## Things NOT in scope for v1

Keep these off the backlog unless Sir Sohail asks:

- Mobile native apps
- Real-time multi-user collaboration in one chat
- Formal citation styles (APA/MLA/Chicago)
- Admin analytics dashboard
- Web search
- Fine-tuning a custom LLM
- Non-English language support

## Primary Users

- **Sir Sohail** — admin: upload PDFs, ask questions, demo to funders.
- **EMU students** — ask questions, read cited answers.
- **Funders (visitors)** — guest access for demos (post-MVP).

## Current Stage

Design spec is written and pending Sir Sohail-level review. No code scaffolded yet. Next step: generate the implementation plan via the `superpowers:writing-plans` skill, then execute.
