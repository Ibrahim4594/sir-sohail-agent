# Typography-only section redesign + real-world polish

**Date:** 2026-04-17
**Status:** Approved — ready for implementation plan
**Context:** Scope expanded after approval — user asked to treat this as a real-world app, not a
funding demo. The three "Phase 2" items at the bottom of this spec were originally optional;
they're now in scope.

## Problem

The app uses editorial/magazine section dividers throughout: label + hairline rule patterns
(`<span className="h-px flex-1 bg-foreground" />`) and full-width `border-y border-rule` wrappers
around settings sections. This vocabulary reads as "luxury product brand / print magazine."

The product is an agent chatbot — peers are ChatGPT, Claude, Perplexity, Linear, Vercel. None of
those use editorial dividers. Every one of them follows the same rule: **borders define regions
without becoming a design element** (Vercel's stated principle). Hierarchy comes from
typography + whitespace, not decorative rules.

User critique (2026-04-17): "you use these lines to separate stuff but it looks very
unprofessional because our website is not a luxury product brand it is a agent chatbot website."

## Goal

Replace the editorial section pattern with a typography-only pattern across the app. Match the
visual vocabulary of the product's actual peer group.

## Non-goals

- Redesigning the landing page hero, sign-in page layout, or chat message bubbles beyond the
  specific label+hairline usage.
- Changing the monochrome tokens, typography scale, or brand mark.
- Removing hairlines that serve a **functional** purpose (list row separators, grid column
  dividers). Only decorative hairlines leave.

## Scope — every hairline use, mapped

### A. Decorative label-plus-hairline hairlines — REMOVE

| Location | Current | Becomes |
|---|---|---|
| `app/settings/page.tsx` — inner `<Section>` component, line ~124 | `<span aria-hidden className="h-px flex-1 bg-foreground" />` next to a `.label label--ink` eyebrow | Delete the hairline span. Delete the eyebrow `<span>` entirely. Keep only the `<h2>` section title. |
| `components/chat/message.tsx:41` — user message header | Hairline next to `<span className="label">You asked</span>` | Delete hairline span. Keep the "You asked" label, but replace `.label` class with a plain muted-foreground span at normal case and size (`text-[11px] font-[500] tracking-normal text-muted-foreground`). |
| `components/chat/message.tsx:59` — assistant message header | Hairline next to `<span className="label label--ink">The assistant</span>` | Delete hairline span. Label itself becomes muted sentence-case, same treatment as the user one. |

### B. Decorative `border-y border-rule` containers — REMOVE

These wrap a single content block to give it "section weight" without listing multiple rows.
They are decorative.

| Location | Current | Becomes |
|---|---|---|
| `app/settings/page.tsx:56` — account info row | `<div className="flex items-center gap-4 border-y border-rule py-6">` | Drop border; use margin/spacing only: `<div className="flex items-center gap-4 py-1">` |
| `app/settings/page.tsx:99` — session/sign-out wrapper | `<div className="border-y border-rule py-6">` | Drop border, keep vertical padding: `<div className="pt-2">` |
| `components/settings/feedback-card.tsx:12` | `<div className="border-y border-rule py-4">` | Drop border: `<div className="py-2">` |
| `components/settings/theme-card.tsx:31` | `<fieldset className="border-y border-rule py-6">` | Drop border: `<fieldset className="py-2">` |

### C. Functional list/grid borders — KEEP

These define structural boundaries between real rows or grid cells. Removing them would hurt
scannability. They stay.

| Location | Purpose | Change |
|---|---|---|
| `app/admin/documents/page.tsx:49` — stats grid `divide-x divide-rule border-y border-rule` | Separates three stats columns | Keep as-is. |
| `app/admin/documents/page.tsx:71` — document list | List row dividers | Keep as-is. |
| `app/overview/page.tsx:37` — stats grid | Same as admin | Keep as-is. |
| `app/page.tsx:96` — landing stats sidebar | List-like spec rows | Keep as-is. |
| `components/chat/sources-panel.tsx:38` — citations list | List row dividers | Keep as-is. |
| `components/chat/empty-state.tsx:80` — suggestion list | List row dividers | Keep as-is. |

If after the decorative hairlines leave the functional borders feel too heavy, we soften them
in a separate follow-up pass. Not in scope here.

### D. `app/page.tsx` header and footer border — KEEP

The landing header has `border-b border-rule` and the footer has `border-t border-rule`. These
are structural (page chrome), not decorative section breaks. They stay.

## Typography + spacing compensation

Without hairlines, sections need whitespace to read as separate. Current spacing is `space-y-10`
in the settings page. Bumping to `space-y-14` gives the breathing room the eye expects when
dividers disappear. This is the Linear/Vercel "generous spacing" principle in action.

Section title typography also needs a tiny upgrade — current is
`font-display text-[22px] font-[500]`. Becomes
`font-display text-[22px] font-[600]` (slightly heavier weight) so it can carry the hierarchy
alone without the eyebrow label above it.

## Message headers in chat — switch to avatars

Every real chatbot peer (ChatGPT, Claude, Perplexity, Cursor) attributes messages with
avatars, not text labels. We keep doing text labels with hairlines. Closing that gap here
because we already own both assets:

- **User messages**: the user's Google OAuth avatar (already stored in Supabase
  `user.user_metadata.avatar_url`, already rendered in the sidebar footer and account menu).
  Falls back to the initials monogram when no avatar is set.
- **Assistant messages**: the Ibid brand mark — `<BrandMark />` from `components/brand/mark.tsx`,
  rendered at ~24px.

### Layout pattern

Avatar sits on the LEFT of the message content, separated by a small gap:

```
[avatar]  User's question text here, streamed in real time
          with paragraphs flowing beneath.

[ibid]    Assistant's answer with [1][2] citation markers
          scrolling in as gemma generates tokens.
```

Instead of the current "label above content" stacked pattern:

```
YOU ASKED ━━━━━━━━━━━━━━━━
User's question here.

THE ASSISTANT ━━━━━━━━━━━━
Assistant's answer here.
```

### Implementation notes

- `components/chat/message.tsx` — replace the `<div className="mb-3 flex items-baseline gap-4">
  <span className="label">You asked</span><span className="h-px flex-1 bg-rule"/></div>` header
  with a two-column flex: avatar slot on the left (24×24), content on the right. Same for the
  assistant variant.
- User avatar source: thread `avatarUrl` down from `ChatShell` (already fetches it in
  `app/chat/layout.tsx` for the sidebar) → `MessageList` → `Message`. If `null`, render the
  initials tile that already exists in `components/chat/account-menu.tsx` (extract into a small
  shared `UserAvatar` component so we don't duplicate).
- Assistant avatar: always `<BrandMark className="size-6 text-foreground" />`. No change needed
  to the brand mark itself.
- Accessibility: each avatar gets `aria-label="You"` or `aria-label="Ibid"` so screen readers
  still announce speaker attribution.
- Mobile: avatars stay at 24×24, content wraps below them; no layout changes needed at narrow
  widths since the message column is already `max-w-3xl`.

## Files affected

- `app/settings/page.tsx` — remove `<Section>` eyebrow + hairline, bump section spacing
- `components/chat/message.tsx` — strip hairlines, switch to avatar-based attribution
- `components/chat/chat-shell.tsx` — thread `avatarUrl` prop through to MessageList/Message
- `components/chat/message-list.tsx` — forward `avatarUrl` prop
- `components/chat/types.ts` (if needed) — accept `avatarUrl: string | null` on the shell
- `components/chat/user-avatar.tsx` *(new)* — reusable 24×24 avatar with initials fallback,
  extracted from the logic currently duplicated in `account-menu.tsx`
- `components/settings/feedback-card.tsx` — drop border-y
- `components/settings/theme-card.tsx` — drop border-y

Phase 1 only — no code changes in these: `components/chat/sources-panel.tsx`,
`components/chat/empty-state.tsx`. Their list-row borders are functional, left untouched.

Phase 2 additions:
- `components/ui/feedback-widget.tsx` — swap emoji SVGs for Lucide monochrome icons
- `app/admin/documents/page.tsx` — soften stats grid (drop outer border-y, tint divide-x)
- `app/overview/page.tsx` — same stats grid treatment
- `app/page.tsx` — trim landing stats sidebar from 3 rows to 2

## Expected end state

Settings page changes from:

```
PREFERENCES ━━━━━━━━━━━━━━━━━━
Settings.

ACCOUNT ━━━━━━━━━━━━━━━━━━━━
Who's signed in
[avatar row bounded by border-y]

APPEARANCE ━━━━━━━━━━━━━━━━━━
Theme
[3 buttons bounded by fieldset border-y]
```

to:

```
Settings


Who's signed in
[avatar row with padding only]


Theme
[3 buttons with padding only]
```

Chat message headers change from:

```
YOU ASKED ━━━━━━━━━━━━━━━━━━━
What is project-based learning?

THE ASSISTANT ━━━━━━━━━━━━━━━
Project-based learning is an instructional
approach [1] that centers on ...
```

to:

```
[user avatar]  What is project-based learning?

[ibid mark]    Project-based learning is an instructional
               approach [1] that centers on ...
```

Matches the attribution pattern every real chatbot peer uses.

Sidebar, landing hero, sign-in layout, PDF side panel: no changes.

## Phase 2 polish — closes the gap from "good" to "real-world-grade"

### 2.1 Feedback widget — swap colored emoji faces for monochrome icons

`components/ui/feedback-widget.tsx` currently uses four colored emoji faces
(😞 😐 😊 😀 rendered as custom SVGs with default fills). Against a strict-monochrome theme
they read as cosplay. Swap for Lucide monochrome icons — same rating semantics, matching
palette:

- Very bad → `Frown` (`lucide-react`)
- Bad → `Meh`
- Okay → `Smile`
- Amazing → `Laugh` (or `SmilePlus`)

All rendered in `text-foreground` with `strokeWidth={1.75}`. The toggle group's active-pill
background + colored fill behaviour stays; only the icons change.

### 2.2 Stats-grid borders — drop outer frame, keep column separators

`app/admin/documents/page.tsx:49` and `app/overview/page.tsx:37` both wrap the stats grid in
`border-y border-rule divide-x divide-rule`. The outer `border-y` is decorative framing —
after the rest of the app goes typography-first, this frame will feel heavy. Keep the
`divide-x` (necessary for column separation); drop the outer `border-y`.

- **Before**: `className="grid divide-x divide-rule border-y border-rule sm:grid-cols-3"`
- **After**: `className="grid divide-x divide-border/60 sm:grid-cols-3"`

Using `border-border/60` (semi-transparent) on the remaining column divider, per Vercel's
"crisp borders, semi-transparent borders improve edge clarity" guideline.

Document-list row separators in `app/admin/documents/page.tsx:71` keep their `border-y` —
those define the outer list bounds and are functional.

### 2.3 Landing stats sidebar — trim from 3 rows to 2

`app/page.tsx:96-101` — the landing hero sidebar has three spec rows:

1. Retrieval · pgvector · top-K 8
2. Generation · Gemma 4 · local
3. Safeguards · 3-layer grounding

The "Generation · Gemma 4 · local" row is an implementation detail that leaks through and ties
the landing to whichever LLM is currently wired (gemma locally, gemini in prod). Drop it. Keep
`Retrieval` (communicates pgvector architecture to technical funders) and `Safeguards`
(communicates the grounding discipline, which is the product promise). Two rows feels more
intentional than three; also leaves headroom to add one if needed later.

## Testing

- Visually verify the settings page at `/settings` — sections read as distinct via spacing alone
- Visually verify a multi-turn chat at `/chat` — "You asked" / "The assistant" labels still read
  but no longer dominate
- Run `pnpm typecheck && pnpm lint && pnpm test` — all green
- Probe `/` (landing), `/chat`, `/overview`, `/admin/documents` — pages render without layout
  shift from the rule tweaks

## Open questions — RESOLVED

- **Eyebrow labels**: user approved Option A — drop entirely. No eyebrows on settings sections.
- **Message attribution**: user chose avatars over text labels (Phase 1).
- **Real-world scope**: user approved Phase 2 additions (feedback icons, stats softening,
  landing trim).

## Rollback

Single commit, easy revert. No schema changes, no data migrations, no new dependencies.
