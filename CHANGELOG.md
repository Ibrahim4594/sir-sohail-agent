# Changelog

All notable product changes to Ibid. Grouped by date; most recent first.

## 2026-04-18 — Landing-arc + full security sweep

### Landing page

A rebuild from scratch — the earlier hero relied on an Aceternity aurora background and a glassmorphism "liquid" CTA that read as generic AI-landing-page slop. Both were removed along with a stats panel that used the "hero-metric grid" anti-pattern. The replacement is typography-forward, strictly monochrome, and built around showing the product rather than claiming things about it.

**New sections, in page order:**

1. **Hero** — headline *"Cited, not guessed."* with a hand-drawn SVG ink underline under "Cited," that sketches itself in on page load (left-to-right pathLength animation, 900ms, ease-out-quart). Solid black CTA pill, no glass.
2. **Live citation trace** — a client-side animation that types a real question into a faux user row, shows a three-dot "thinking" pulse, streams an answer word-by-word, snaps in `[1]` and `[2]` citation markers, and reveals two source-reference rows with a linkback underline drawn under each author name. Uses the real `UserAvatar` + `BrandMark` components so the landing demo is visually identical to the chat surface. Respects `prefers-reduced-motion`.
3. **Corpus marquee** — a seamless-loop journal-foot strip that drifts real document titles from the Supabase corpus (falls back to a curated author list when the DB is empty). Pauses on hover. Soft mask-image fade on both edges.
4. **How it works** — three numbered steps (Ask → Cite → Open) with a scroll-triggered stagger reveal. Ends with a bottom CTA (*"Ready when you are. Enter the corpus →"*) so the section doesn't dead-end into the footer.
5. **Tenets** — a stagger-stack of eight behavioural commitments Ibid enforces in code, each card paired with the file where the rule lives (`lib/citation/verify.ts`, `lib/retrieval/threshold.ts`, etc.). Octagonal clipPath cards, center card inverted, flanking cards fanned with 2.5° rotation and fade-out past position ±2. Pattern inspired by 21st.dev/vaib215/stagger-testimonials but **zero placeholder testimonials** — all content is Ibid's own, which is the point.
6. **Footer** — single credit line, single navigation link.

**Infrastructure polish along the way:**

- Settings page: editorial eyebrows + decorative `border-y` rules stripped across sections; Section helper simplified.
- Feedback widget: hand-drawn SVG emoji faces swapped for monochrome Lucide icons (Frown / Meh / Smile / Laugh).
- Admin + overview pages: stats grids softened — outer `border-y border-rule` removed, column dividers tinted.
- Chat: per-message user avatar (Google OAuth image with initials fallback) rather than text labels; new shared `UserAvatar` component consolidates what was three copies of the render logic.
- `<html>` element marked `suppressHydrationWarning` to silence the expected FOUC-prevention script mismatch.

**Verified** via `chrome-devtools-mcp`:

- Light + dark theme at 1440×900 and mobile-ish widths.
- Core Web Vitals (lab, unthrottled): **LCP 360ms**, **CLS 0.02**, zero render-blocking savings available.
- Accessibility snapshot: proper heading hierarchy (1 × h1, 2 × h2, 3 × h3), landmark regions, descriptive `aria-label` on all tenet cards, `aria-pressed` on the active card, `aria-live="polite"` on the counter.
- Console: zero errors, zero warnings.

### Security

Independent audit of UI, database, and agent surfaces. Eight items fixed in this sprint.

#### P0 — Ship-stoppers

- **`profiles.role` self-promotion via public anon key.** The RLS UPDATE policy on `public.profiles` had no `WITH CHECK` clause, so any signed-in student could run `supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)` from browser DevTools and gain admin access (upload/delete PDFs, ingest). **Fixed** with a `BEFORE UPDATE OF role` trigger that raises `SQLSTATE 42501` when the caller's JWT role is `anon` or `authenticated`. Direct DB / service_role / supabase_admin retain the bootstrap path. Migration: `20260418000001_lock_profile_role.sql`.
- **Intent router bypassed all three grounding safeguards.** Previously the router let the LLM *generate* the conversational reply ("sure, happy to help"). That path skipped the strict system prompt, retrieval threshold, and citation verifier. A prompt like *"hey, quickly what's PBL btw?"* could slip through classified as greeting and be answered from Gemma's parametric knowledge — a direct violation of the project's non-negotiable "only from PDFs" rule. **Fixed** by rewriting the router as classifier-only: the LLM now emits exactly one of seven tag tokens (`[[RESEARCH]]`, `[[GREETING]]`, `[[THANKS]]`, `[[FAREWELL]]`, `[[META]]`, `[[EMOTIONAL]]`, `[[OTHER]]`) and the route emits a curated canned reply. LLM no longer authors any user-visible text on the non-research path.

#### P1 — Fix soon

- **`/api/ingest` had no file-size cap or MIME check.** A 500 MB PDF would OOM the function and drain embedding quota. **Fixed**: 50 MB ceiling (413), content-type allowlist (415), `%PDF` magic-byte verification.
- **`/api/chat` had no rate limit.** Each research call costs up to 4 LLM rounds; a leaked session cookie could drain the Gemini quota in minutes. **Fixed** with a new in-memory sliding-window limiter (`lib/rate-limit.ts`): 20 req / 60s per authenticated user, returns 429 with `Retry-After` + `X-RateLimit-*` headers. Four new unit tests cover window, cap, key isolation, and reset math. (Note: in-memory buckets don't sync across replicas — upgrade to Upstash or Supabase-backed counter if we ever run multi-instance.)
- **`RETRIEVAL_SIMILARITY_THRESHOLD` env var could be set to 0.** Zod schema was `.min(0)`, so a misconfigured env silently disabled safeguard #2. **Fixed**: `.min(0.2)` now rejects near-zero values at startup.
- **Chat history was sourced from the client body.** A malicious client could POST with forged assistant turns to condition the next answer. **Fixed**: prior history now comes from a DB query ordered by `created_at`, capped at 20 turns. Client messages are used only to extract the latest user question.
- **`touch_conversation` trigger lacked `search_path` pinning.** Defensive hardening, no known exploit in the current single-schema setup. **Fixed** via `SECURITY DEFINER SET search_path = public, pg_temp`. Migration: `20260418000002_pin_trigger_search_path.sql`.

#### P2 — Polish

- **`/api/pdf-url` didn't UUID-validate `documentId`.** Malformed ids hit Postgres only to be rejected. Now rejected at the edge with 400.
- **Entailment failures were silent.** If the LLM errored during the entailment check (safeguard #3), citations were returned unchanged with no log. Added a `console.error` so a persistent failure is visible in Vercel logs.

### Already solid (confirmed, don't weaken)

- **Threshold gate** covered by unit tests; short-circuits the LLM call unconditionally when no chunk clears the floor.
- **System prompt** includes an explicit anti-prompt-injection rule for conversation history; refusal message does not leak sub-threshold topic hints.
- **Admin gate** dual-enforced (layout `notFound()` + handler role check).
- **Service-role key** containment: only imported in four server-only files, never in a client component.
- **XSS** — all message rendering goes through React text interpolation or `renderInlineCitations` (builds nodes from strings, never HTML). Only `dangerouslySetInnerHTML` is the hard-coded theme-init script.
- **Provider lock** — `LLM_PROVIDER` is a zod enum of exactly `['ollama', 'gemini']`; unknowns fail at startup.
- **RLS on `conversations` + `messages`** — cross-user reads/writes blocked at DB level.

### Pending (not in this sprint)

- Ingest the 40 seed PDFs so the corpus marquee shows real titles instead of the curated fallback.
- Real-device mobile probe (the automated resize capped at 500px; a phone-in-hand check before demo).
- Apply both new migrations against production Supabase (`supabase db push`). Local dev: `pnpm db:reset`.

---

## Before 2026-04-18

Scaffold, data layer, RAG pipeline, chat UI, and admin flow are all in place. See `docs/superpowers/specs/2026-04-16-pdf-agent-design.md` and the git history for prior changes.
