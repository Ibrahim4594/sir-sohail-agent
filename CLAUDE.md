# CLAUDE.md — project context for AI assistants

This file is read first by AI assistants working in this repo. Keep it current.

## Project: PDF-Grounded Research Agent (`pdf-agent`)

A chat-style web tool that lets Prof. Sohail (Eastern Michigan University) and his students ask natural-language questions about a corpus of ~40 academic PDFs. The agent **answers only from the PDFs** — never from general knowledge, never from the web. Every answer cites its source(s), and every citation links to the exact page of the source PDF.

Project has funding-demo potential — **treat it as a product, not a prototype**.

- Full spec: [`docs/superpowers/specs/2026-04-16-pdf-agent-design.md`](docs/superpowers/specs/2026-04-16-pdf-agent-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-04-16-pdf-agent-implementation.md`](docs/superpowers/plans/2026-04-16-pdf-agent-implementation.md)

## The One Non-Negotiable Rule

**Strict grounding.** The agent must never answer from the base LLM's own knowledge. If retrieval returns nothing relevant, the agent refuses with a soft message and lists related topics the corpus *does* cover. Every claim is backed by a verified citation (paper + page + exact snippet). Three safeguards enforce this and **must remain intact**:

1. **System-prompt discipline** — see [`lib/prompt/system-prompt.ts`](lib/prompt/system-prompt.ts).
2. **Retrieval similarity threshold** — if no chunk clears `RETRIEVAL_SIMILARITY_THRESHOLD` (default 0.5 cosine), the LLM is skipped entirely. See [`lib/retrieval/threshold.ts`](lib/retrieval/threshold.ts) and [`app/api/chat/route.ts`](app/api/chat/route.ts).
3. **Post-generation citation verification** — every `[N]` marker in the LLM output is mapped back to a retrieved chunk; unmapped markers are flagged `valid: false` in the UI. See [`lib/citation/verify.ts`](lib/citation/verify.ts).

Any change that weakens any of these safeguards needs explicit approval.

## Tech Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind 4 |
| UI components | shadcn/ui on top of `@base-ui/react` (not Radix) — plus approved peers below |
| Extra UI libraries (opt-in, per component) | 21st.dev · Magic UI · Aceternity UI · Material UI (MUI) |
| Scroll / timeline animation | GSAP (+ ScrollTrigger) |
| Motion-graphic animation | Lottie (JSON exported from After Effects / LottieFiles) |
| AI layer | Vercel AI SDK v6 |
| LLM (all environments) | Google Gemini — `gemini-3.1-pro-preview` via `@ai-sdk/google` |
| Embeddings | `gemini-embedding-001` via Google, truncated to 768 dims (Matryoshka) to match `pgvector(768)` |
| PDF parsing | `unpdf` |
| PDF viewing | `react-pdf` |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth (Google OAuth) |
| File storage | Supabase Storage |
| Deployment | Vercel |
| Package manager | pnpm 10 |
| Linter/formatter | Biome 2 |
| Testing | Vitest (unit + integration), Playwright (E2E) |

## Key Architectural Decisions

- **Single LLM provider.** As of 2026-04-22, Gemini is the only provider (per Sir Sohail's meeting — see [`.claude/memory/2026-04-22-sohail-meeting.txt`](.claude/memory/2026-04-22-sohail-meeting.txt)). All calls go through [`lib/llm/model.ts`](lib/llm/model.ts). Feature code must not import provider SDKs directly.
- **Retrieval uses a single Postgres RPC** (`search_chunks`) implemented in [`supabase/migrations/20260416000003_documents_chunks.sql`](supabase/migrations/20260416000003_documents_chunks.sql). Section column + index added by [`20260422000001_chunk_sections.sql`](supabase/migrations/20260422000001_chunk_sections.sql).
- **Ingestion runs server-side only.** PDFs never leave the server to be parsed. See [`lib/ingest/ingest-document.ts`](lib/ingest/ingest-document.ts).
- **Chunk size ≈ 2000 chars / 500 tokens with 200-char overlap**, segmented by IMRaD section before chunking (see [`lib/ingest/sections.ts`](lib/ingest/sections.ts)).
- **Retrieval top-K = 8, threshold = 0.5 cosine** — both env-configurable. Section-aware bias runs between threshold gate and reranker (see [`lib/retrieval/section-bias.ts`](lib/retrieval/section-bias.ts)).
- **Env vars are validated with zod** in [`lib/env.ts`](lib/env.ts) (lazy, cached). Non-public env vars MUST NOT be read directly from `process.env` in feature code.
- **Vector column typing:** Supabase's generated types represent `vector(768)` as `string`. The JS client serializes `number[]` correctly on the wire, so the `as unknown as string` cast at RPC/insert sites is expected and safe — don't remove it without schema changes.

## Repo Layout (actual)

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/sign-in/           # sign-in page
│   ├── (auth)/auth/callback/     # OAuth code exchange
│   ├── admin/documents/          # admin-only PDF upload
│   ├── chat/                     # chat UI — [conversationId]/ for existing
│   ├── overview/                 # corpus overview
│   └── api/
│       ├── chat/                 # streaming chat endpoint
│       ├── ingest/               # PDF upload + processing
│       └── pdf-url/              # signed-URL proxy for the PDF viewer
├── components/
│   ├── auth/sign-in-button.tsx
│   ├── chat/                     # chat UI pieces (client)
│   ├── pdf/                      # PDF side panel + viewer
│   ├── sidebar/                  # conversation list + account menu
│   └── ui/                       # shadcn/ui primitives (generated — do not hand-edit)
├── lib/
│   ├── citation/                 # marker extraction + verification
│   ├── ingest/                   # PDF parse → chunk → embed → store
│   ├── llm/                      # provider factory
│   ├── prompt/                   # system prompt + prompt builder
│   ├── retrieval/                # embedding search + threshold gate
│   ├── supabase/                 # browser/server/middleware clients + Database type
│   ├── env.ts                    # zod-validated env
│   └── utils.ts                  # `cn` helper (shadcn)
├── middleware.ts                 # auth redirect for non-public paths
├── scripts/ingest-corpus.ts      # one-off: bulk-ingest the 40 seed PDFs
├── supabase/migrations/          # pgvector + tables + RPC + RLS
├── tests/fixtures/               # golden Q&A + refusal set + sample PDF
├── pdfs/                         # seed PDFs (gitignored; uploaded to Supabase Storage by the CLI)
└── docs/superpowers/{specs,plans}/
```

## Local Development

Prerequisites:
- Node 20+ and pnpm 10
- A Google AI Studio API key with billing enabled (https://aistudio.google.com/apikey)
- A Supabase project (hosted or local)
- Supabase CLI — `npm install -g supabase` (only needed if using the local stack)
- A Google Cloud OAuth client (for sign-in)

One-time setup:

```bash
pnpm install

# Copy the env template and fill in the Supabase URL/keys + GEMINI_API_KEY
cp .env.example .env.local
# Edit .env.local with your editor

# Apply migrations (skip if using hosted Supabase with migrations already pushed)
pnpm db:reset

# Regenerate the Database type from the running DB (overwrites the stub)
pnpm db:types

# One-time bulk ingest of the 40 seed PDFs from ./pdfs. Uses Gemini
# embeddings and so will consume a small amount of API credit.
pnpm ingest:corpus
```

Day-to-day:

```bash
pnpm dev        # Next.js dev server (Turbopack)
pnpm test       # unit + integration (non-live)
pnpm lint       # Biome check
pnpm typecheck  # tsc --noEmit
pnpm build      # production build
```

Integration tests that actually hit Gemini + the DB are gated behind `RAG_LIVE_TESTS=1`:

```bash
RAG_LIVE_TESTS=1 pnpm test
```

### Bootstrap the first admin

After your first sign-in, promote your account in Supabase Studio (http://127.0.0.1:54323) → SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users order by created_at asc limit 1);
```

## UI & Animation Stack — rules for picking a library

Mix-and-match from this approved list, whichever gives the best result for a specific component or interaction. Read this list **before** designing any new UI piece.

- **shadcn/ui** — the default surface for forms, layout, dialogs, menus, everything accessibility-sensitive. Already installed; extend via `pnpm dlx shadcn@latest add <name>`.
- **21st.dev** — beautiful, shadcn-compatible components (hero sections, pricing tables, marketing blocks). Install via `pnpm dlx shadcn@latest add <21st.dev URL>`.
- **Magic UI** (`magicui.design`) — premium animated primitives (marquee, meteors, shimmer buttons, animated beams). shadcn-compatible install flow.
- **Aceternity UI** (`ui.aceternity.com`) — premium motion components (spotlight, 3D card, moving border, etc.). Usually copy-paste + a `motion` / `framer-motion` peer dep.
- **Material UI (MUI)** — use only when nothing from the above gets the job done (e.g., complex data tables, specialized form controls). Note: MUI uses `@emotion` while the rest of the stack is Tailwind-first — keep MUI usage surgical to avoid runtime overlap.
- **GSAP** — for timeline-based, scroll-pinned, or stagger-heavy motion that framer-motion/css can't handle cleanly. Import `ScrollTrigger` when the animation is scroll-driven.
- **Lottie** — for motion-graphics-style JSON animations exported from After Effects or picked from LottieFiles. Use `lottie-react` in React components.

## Install rule — MANDATORY

**No package gets installed without explicit user approval.** Before running `pnpm add`, `pnpm dlx`, or any command that adds a dependency (including a shadcn component fetch that pulls a new peer), stop and propose:

> "To build X, I want to install Y [plus peer deps Z]. OK?"

Wait for yes. This applies equally to a 21st.dev component, a Magic UI animation, an Aceternity snippet, or a single npm utility. No surprises.

## Conventions

- **TypeScript strict.** No `any` (Biome rule). Non-null assertions (`!`) are banned — use `as string` for `process.env.NEXT_PUBLIC_*` or wrap with `env()`.
- **Env access:** server-only code must go through `env()` from `lib/env.ts`. Client code may read `process.env.NEXT_PUBLIC_*` directly (those are compile-time inlined).
- **Server-side secrets only.** `SUPABASE_SERVICE_ROLE_KEY` and any API key must never be imported, logged, or shipped to the client.
- **One concern per file.** If a file exceeds ~250 lines, consider splitting.
- **Tests co-located with source** (`foo.ts` ↔ `foo.test.ts`). Integration tests under `tests/integration/`. E2E under `tests/e2e/`.
- **No speculative abstraction.** Three similar lines beat a premature helper.
- **Comment the WHY, never the WHAT.** Names do the explaining.
- **LLM provider abstraction is the ONLY path.** Feature code must import from [`lib/llm/model.ts`](lib/llm/model.ts); never call `@ai-sdk/google` or any other provider SDK directly from a feature file.
- **shadcn/ui = base-ui.** This project's `components/ui/button.tsx` wraps `@base-ui/react/button`, not Radix. `<Button asChild>` does **not** work — use `<Link className={cn(buttonVariants(...))}>` instead.
- **Don't hand-edit `components/ui/*`.** Those are generated by `pnpm dlx shadcn@latest add <component>`. Biome excludes them from linting for this reason.

## Things NOT in scope for v1

- Mobile native apps
- Real-time multi-user collaboration in a single chat
- Formal citation styles (APA/MLA/Chicago)
- Admin analytics dashboard
- Web search
- Fine-tuning a custom LLM
- Non-English language support

## Primary Users

- **Sir Sohail** — admin: uploads PDFs, asks questions, demos to funders.
- **EMU students** — ask questions, read cited answers.
- **Funders (visitors)** — guest access is post-MVP.

## Current Stage

Scaffold + data layer + RAG pipeline + chat UI + admin flow are all in place. The pipeline runs on pure Gemini 3.1 Pro (chat + rerank + entailment + titles + follow-ups) with `gemini-embedding-001` for retrieval. Re-ingestion (`pnpm ingest:corpus`) is required any time `GEMINI_EMBEDDING_MODEL` changes because the embedding space changes with it. The app is demo-ready on `pnpm dev` once the 40 PDFs are ingested.
