# Typography-Only Section Redesign + Real-World Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip editorial/magazine section dividers across the app. Replace chat message text-labels with avatars. Polish the feedback widget, stats grids, and landing sidebar to match peer chatbot products (ChatGPT / Claude / Linear / Vercel).

**Architecture:** Isolated UI-only changes — no schema edits, no new runtime deps, no changes to the RAG pipeline. Introduce one shared component (`UserAvatar`) to kill duplication in account-menu and sidebar footer, thread an `avatarUrl` prop through the chat-shell stack so the `Message` component can render speaker attribution, then remove decorative borders/eyebrows across settings and landing.

**Tech Stack:** Next.js 16 (App Router, Turbopack), Tailwind 4, TypeScript strict, React 19, shadcn/ui primitives on `@base-ui/react`, Vitest (node env), Biome 2 for lint+format, Lucide icons, pnpm.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `components/chat/user-avatar.tsx` | Shared 24×24 avatar — renders the OAuth image when provided, else an initials tile. Used in chat messages, account menu, sidebar footer. |
| `components/chat/user-avatar.test.ts` | Unit tests for the avatar's conditional rendering (vitest, node env, no DOM). |

### Modified files

| Path | What changes |
|---|---|
| `components/chat/chat-shell.tsx` | Accept + forward `avatarUrl` prop |
| `components/chat/message-list.tsx` | Accept + forward `avatarUrl` prop |
| `components/chat/message.tsx` | Replace "You asked" / "The assistant" label headers with avatar-left, content-right layout |
| `app/chat/page.tsx` | Fetch avatarUrl from Supabase user metadata, pass to ChatShell |
| `app/chat/[conversationId]/page.tsx` | Same |
| `components/chat/account-menu.tsx` | Replace inline avatar rendering with `<UserAvatar>` |
| `components/chat/sidebar.tsx` | Replace inline footer avatar rendering with `<UserAvatar>` |
| `app/settings/page.tsx` | Drop Section eyebrow + hairline, drop border-y on account/session rows, bump spacing + title weight |
| `components/settings/feedback-card.tsx` | Drop `border-y border-rule` wrapper |
| `components/settings/theme-card.tsx` | Drop `border-y border-rule` wrapper |
| `components/ui/feedback-widget.tsx` | Swap colored emoji SVGs for Lucide mono icons (Frown / Meh / Smile / Laugh) |
| `app/admin/documents/page.tsx` | Soften stats grid: drop outer `border-y`, tint `divide-x` to `border-border/60` |
| `app/overview/page.tsx` | Same stats grid softening |
| `app/page.tsx` | Remove "Generation · Gemma 4 · local" row from landing sidebar (3→2 spec rows) |

### Files that stay exactly as-is

- `components/chat/sources-panel.tsx`, `components/chat/empty-state.tsx` — list-row borders are functional
- `components/brand/mark.tsx` — the Ibid knot mark used for assistant avatars (already built)
- `lib/use-theme.ts`, `components/theme/*` — theme system untouched
- `app/(auth)/sign-in/page.tsx` — sign-in editorial panel stays
- All `lib/*`, `app/api/*` — no server-side changes

---

## Task 1 — Shared UserAvatar component

**Why first:** Three places in the app currently duplicate the "render OAuth image or initials tile" logic. Extracting it first means every downstream change in this plan can depend on one source of truth.

**Files:**
- Create: `components/chat/user-avatar.tsx`
- Create: `components/chat/user-avatar.test.ts`
- Modify: `components/chat/account-menu.tsx:43-62` — swap inline avatar for `<UserAvatar>`
- Modify: `components/chat/sidebar.tsx:180-198` — swap inline footer avatar for `<UserAvatar>`

- [ ] **Step 1: Write the failing test**

Create `components/chat/user-avatar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  it('renders an img element when avatarUrl is provided', () => {
    const el = UserAvatar({
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      displayName: 'Ibrahim Samad',
    });
    expect(el.type).toBe('img');
    expect(el.props.src).toBe('https://lh3.googleusercontent.com/a/default-user=s96-c');
    expect(el.props.alt).toBe('');
    expect(el.props.referrerPolicy).toBe('no-referrer');
  });

  it('renders an initials tile when avatarUrl is null', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: 'Ibrahim Samad' });
    expect(el.type).toBe('span');
    expect(el.props.children).toBe('IS');
    expect(el.props['aria-hidden']).toBe(true);
  });

  it('uppercases the initials regardless of input case', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: 'alice' });
    expect(el.props.children).toBe('AL');
  });

  it('handles single-character displayName without crashing', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: 'A' });
    expect(el.props.children).toBe('A');
  });

  it('falls back to a placeholder initial when displayName is empty', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: '' });
    expect(el.type).toBe('span');
    expect(el.props.children).toBe('?');
  });

  it('accepts a className that is forwarded to the rendered element', () => {
    const withImg = UserAvatar({
      avatarUrl: 'https://example.com/a.jpg',
      displayName: 'A',
      className: 'h-12 w-12',
    });
    expect(withImg.props.className).toContain('h-12 w-12');

    const withInitials = UserAvatar({ avatarUrl: null, displayName: 'A', className: 'h-12 w-12' });
    expect(withInitials.props.className).toContain('h-12 w-12');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run components/chat/user-avatar.test.ts`

Expected: FAIL with "Failed to resolve import './user-avatar'" or similar module-not-found error.

- [ ] **Step 3: Implement the UserAvatar component**

Create `components/chat/user-avatar.tsx`:

```tsx
import { cn } from '@/lib/utils';

/**
 * Shared avatar — renders the OAuth profile image when available, else
 * a monochrome initials tile. Centralises what used to be duplicated
 * across account-menu.tsx, sidebar.tsx, and (now) message.tsx.
 *
 * Callable as a function (not just JSX) so the unit tests can inspect
 * the returned React element without needing a DOM. Keep it pure —
 * no hooks, no context.
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  className,
}: {
  avatarUrl: string | null;
  displayName: string;
  className?: string;
}) {
  const trimmed = displayName.trim();
  const initials =
    trimmed.length === 0
      ? '?'
      : trimmed.length === 1
        ? trimmed.charAt(0).toUpperCase()
        : trimmed.slice(0, 2).toUpperCase();

  const baseClass = 'shrink-0 rounded-[5px]';

  if (avatarUrl) {
    // biome-ignore lint/performance/noImgElement: OAuth profile URLs vary in size; next/image can't predict
    return (
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(baseClass, 'object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        baseClass,
        'grid place-items-center bg-foreground text-[12px] font-[600] leading-none tracking-[0.04em] text-background',
        className,
      )}
    >
      {initials}
    </span>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run components/chat/user-avatar.test.ts`

Expected: 6 tests pass.

- [ ] **Step 5: Use UserAvatar in account-menu.tsx**

Modify `components/chat/account-menu.tsx`. Replace the inline avatar block (lines 43-62 — the `{avatarUrl ? <img ... /> : <span>...{initials}...</span>}` conditional inside the `DropdownMenuTrigger`) with:

```tsx
<UserAvatar
  avatarUrl={avatarUrl}
  displayName={displayName || email}
  className="h-9 w-9"
/>
```

Add the import at the top with the other `@/components/...` imports:

```tsx
import { UserAvatar } from '@/components/chat/user-avatar';
```

Remove the now-unused `initials` prop from the component signature AND from the caller in `components/chat/sidebar.tsx:176` where `<AccountMenu ... initials={initials} />` is used. The caller stops passing `initials`.

- [ ] **Step 6: Use UserAvatar in sidebar.tsx footer**

Modify `components/chat/sidebar.tsx`. Find the `<SidebarFooter>` block (around line 180-198) where the `{avatarUrl ? <img ... /> : <span>{initials}</span>}` conditional renders the collapsed-mode avatar. Replace with:

```tsx
<UserAvatar
  avatarUrl={avatarUrl}
  displayName={displayName || email}
  className="h-8 w-8"
/>
```

Add the import next to the existing `@/components/chat/...` imports:

```tsx
import { UserAvatar } from '@/components/chat/user-avatar';
```

- [ ] **Step 7: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: both clean. If biome auto-fix is needed, run `pnpm exec biome check --write components/chat/account-menu.tsx components/chat/sidebar.tsx components/chat/user-avatar.tsx` and re-lint.

- [ ] **Step 8: Run the full unit suite**

Run: `pnpm test`

Expected: all previously-passing tests still pass; new UserAvatar tests counted in total.

- [ ] **Step 9: Commit**

```bash
git add components/chat/user-avatar.tsx components/chat/user-avatar.test.ts components/chat/account-menu.tsx components/chat/sidebar.tsx
git commit -m "feat(chat): extract shared UserAvatar, kill duplicate render logic"
```

---

## Task 2 — Thread avatarUrl through the chat shell

**Why second:** The Message component will need `avatarUrl` to render the user's message attribution. The shell already gets it from Supabase (it's passed to the Sidebar) but the chat column never saw it. This task does pure prop threading — no visible UI change yet.

**Files:**
- Modify: `components/chat/chat-shell.tsx` — add `avatarUrl?: string | null` prop, forward to MessageList
- Modify: `components/chat/message-list.tsx` — add `avatarUrl?: string | null` prop, forward to Message
- Modify: `components/chat/message.tsx` — add `avatarUrl?: string | null` prop (not yet consumed; Task 3 wires it in)
- Modify: `app/chat/page.tsx` — fetch avatarUrl from `user.user_metadata`, pass to `<ChatShell>`
- Modify: `app/chat/[conversationId]/page.tsx` — same

- [ ] **Step 1: Add avatarUrl to ChatShell props**

In `components/chat/chat-shell.tsx`, update the props type of `ChatShell`:

```tsx
export function ChatShell({
  initialId,
  initialMessages,
  displayName,
  avatarUrl,
}: {
  initialId?: string;
  initialMessages: UIMessage[];
  displayName?: string;
  avatarUrl?: string | null;
}) {
```

Then in the render, pass it down to `MessageList`:

```tsx
<MessageList messages={messages} onOpenCitation={setPanelCitation} avatarUrl={avatarUrl} />
```

- [ ] **Step 2: Add avatarUrl to MessageList props**

In `components/chat/message-list.tsx`, update the props:

```tsx
export function MessageList({
  messages,
  onOpenCitation,
  avatarUrl,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: Citation) => void;
  avatarUrl?: string | null;
}) {
```

In the `messages.map((m, i) => ...)` inside the render, forward `avatarUrl`:

```tsx
<Message
  key={m.id}
  message={m}
  onOpenCitation={onOpenCitation}
  isFirst={i === 0 || messages[i - 1]?.role !== 'assistant'}
  avatarUrl={avatarUrl}
  displayName={''}
/>
```

Wait — we need the display name too for the initials fallback. Update MessageList props further:

```tsx
export function MessageList({
  messages,
  onOpenCitation,
  avatarUrl,
  displayName,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: Citation) => void;
  avatarUrl?: string | null;
  displayName?: string;
}) {
```

And the Message invocation:

```tsx
<Message
  key={m.id}
  message={m}
  onOpenCitation={onOpenCitation}
  isFirst={i === 0 || messages[i - 1]?.role !== 'assistant'}
  avatarUrl={avatarUrl}
  displayName={displayName}
/>
```

Then back in ChatShell update the MessageList call to also pass displayName:

```tsx
<MessageList
  messages={messages}
  onOpenCitation={setPanelCitation}
  avatarUrl={avatarUrl}
  displayName={displayName}
/>
```

- [ ] **Step 3: Add avatarUrl + displayName to Message props (not yet used)**

In `components/chat/message.tsx`, update the `MessageImpl` signature to accept the new props but NOT consume them yet (Task 3 wires them into the render). This step just keeps typecheck clean:

```tsx
function MessageImpl({
  message,
  onOpenCitation,
  avatarUrl,
  displayName,
}: {
  message: UIMessage;
  onOpenCitation: (citation: Citation) => void;
  isFirst: boolean;
  avatarUrl?: string | null;
  displayName?: string;
}) {
```

Leave the function body as-is for now. The `memo()` wrapper stays unchanged.

- [ ] **Step 4: Wire avatarUrl in app/chat/page.tsx**

Read the current file. It fetches `user` from Supabase. Add `avatarUrl` extraction and pass to ChatShell:

In `app/chat/page.tsx`, near where `<ChatShell>` is rendered, ensure this flow:

```tsx
const avatarUrl =
  (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
  (user.user_metadata as { picture?: string } | null)?.picture ??
  null;

return <ChatShell displayName={displayName} avatarUrl={avatarUrl} initialMessages={[]} />;
```

(Adjust `initialMessages` to match the file's existing value — don't add a new prop, just include `avatarUrl` in the props already being passed.)

- [ ] **Step 5: Wire avatarUrl in app/chat/[conversationId]/page.tsx**

Same change — extract avatarUrl from `user.user_metadata`, pass it to the `<ChatShell>` call. The file already fetches the user; we're only adding the avatarUrl derivation and the prop.

- [ ] **Step 6: Verify typecheck + lint + tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`

Expected: all clean. No visible UI change yet — this is just prop plumbing.

- [ ] **Step 7: Commit**

```bash
git add components/chat/chat-shell.tsx components/chat/message-list.tsx components/chat/message.tsx app/chat/page.tsx app/chat/[conversationId]/page.tsx
git commit -m "refactor(chat): thread avatarUrl + displayName through shell → list → message"
```

---

## Task 3 — Replace chat message label headers with avatars

**Files:**
- Modify: `components/chat/message.tsx:25-42` (user message block) and `:46-56` (assistant message header block) — replace the label+hairline header with avatar-left, content-right layout

- [ ] **Step 1: Add imports at top of message.tsx**

At the top of `components/chat/message.tsx`, add:

```tsx
import { BrandMark } from '@/components/brand/mark';
import { UserAvatar } from './user-avatar';
```

- [ ] **Step 2: Replace the user message branch**

Find this block (around line 25-42):

```tsx
if (role === 'user') {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
    >
      <div className="mb-3 flex items-baseline gap-4">
        <span className="label">You asked</span>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>
      <p className="whitespace-pre-wrap font-display text-[22px] leading-[1.35] font-[400] tracking-[-0.015em] text-foreground">
        {content}
      </p>
    </motion.div>
  );
}
```

Replace with:

```tsx
if (role === 'user') {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
    >
      <div className="flex gap-4">
        <div
          className="shrink-0 pt-1"
          role="img"
          aria-label="You"
        >
          <UserAvatar
            avatarUrl={avatarUrl ?? null}
            displayName={displayName ?? 'You'}
            className="h-6 w-6"
          />
        </div>
        <p className="flex-1 whitespace-pre-wrap font-display text-[22px] leading-[1.35] font-[400] tracking-[-0.015em] text-foreground">
          {content}
        </p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Replace the assistant message branch (full return block)**

Replace the entire assistant branch with this complete block. Find the existing `return (` that starts the assistant branch (everything after the user-branch `if (role === 'user') { return (...); }` block) and replace it end-to-end:

```tsx
return (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
  >
    <div className="flex gap-4">
      <div className="shrink-0 pt-1" role="img" aria-label="Ibid">
        <BrandMark className="h-6 w-6 text-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <article className={cn('space-y-5 text-[16px] leading-[1.72] text-foreground')}>
          {paragraphs.length === 0 ? (
            <p className="text-muted-foreground">
              <span className="caret" />
            </p>
          ) : (
            paragraphs.map((p, i) => {
              const isLast = i === paragraphs.length - 1;
              const lines = p.split('\n');
              const isList = lines.every((l) => /^[-•]\s+/.test(l));
              const pKey = `${i}:${p.slice(0, 32)}`;
              if (isList) {
                return (
                  <ul key={pKey} className="space-y-2 pl-6">
                    {lines.map((l, j) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: streamed bullet — positional key is correct
                      <li key={`${pKey}:bullet:${j}`} className="relative">
                        <span
                          aria-hidden
                          className="absolute -left-5 top-[0.7em] h-px w-3 bg-foreground"
                        />
                        {renderInlineCitations(l.replace(/^[-•]\s+/, ''), citations, onOpenCitation)}
                        {streaming && isLast && j === lines.length - 1 && <span className="caret" />}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={pKey}>
                  {renderInlineCitations(p, citations, onOpenCitation)}
                  {streaming && isLast && <span className="caret" />}
                </p>
              );
            })
          )}
        </article>

        {error && (
          <p
            role="alert"
            className="mt-4 border border-destructive bg-destructive/[0.06] px-3 py-2 text-[12px] font-[500] leading-[1.5] text-destructive"
          >
            {error}
          </p>
        )}

        {citations && citations.length > 0 && (
          <SourcesPanel citations={citations} onOpen={onOpenCitation} />
        )}
      </div>
    </div>
  </motion.div>
);
```

Key structural change: the whole article + error + sources panel now sits inside a flex column on the right (`<div className="min-w-0 flex-1">`), and the Ibid brand-mark avatar sits in a `shrink-0` column on the left. The outer wrapper is `<div className="flex gap-4">`. The label-plus-hairline header div is gone.

**Other content stays identical** — the paragraph splitting, bullet detection, citation rendering, error styling, SourcesPanel call — every piece of behaviour is preserved. Only the outer shell changed shape.

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: clean. Biome may flag formatting on the restructured JSX — run `pnpm exec biome format --write components/chat/message.tsx` if so.

- [ ] **Step 5: Probe dev server**

Ensure the dev server is running (`pnpm exec next dev --turbopack -p 6769` in a separate terminal). Hit the chat page in the browser:

```
http://localhost:6769/chat
```

Expected: existing conversation messages render with the user's Google avatar on the left of their messages, and the Ibid knot mark on the left of assistant messages. No "YOU ASKED" / "THE ASSISTANT" labels. No hairlines.

If you don't have a Google avatar on your account, the user side should show an initials tile (your display name's first two letters).

- [ ] **Step 6: Commit**

```bash
git add components/chat/message.tsx
git commit -m "feat(chat): attribute messages with avatars instead of label+hairline"
```

---

## Task 4 — Settings page cleanup

**Files:**
- Modify: `app/settings/page.tsx` — drop Section eyebrow + hairline, drop border-y on account + session rows, bump spacing + title weight
- Modify: `components/settings/feedback-card.tsx` — drop border-y
- Modify: `components/settings/theme-card.tsx` — drop border-y

- [ ] **Step 1: Strip Section component's eyebrow + hairline**

In `app/settings/page.tsx`, find the `Section` helper at the bottom of the file (around line 115-130). The current version renders an eyebrow label with a hairline. Replace it with a title-only version:

```tsx
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-5 font-display text-[22px] font-[600] leading-[1.2] tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
```

Note three changes from the current version:
- Dropped the `label` prop entirely
- Dropped the eyebrow `<div>` containing label span + hairline
- Bumped title weight from 500 to 600 and margin-bottom from 4 to 5

Update every `<Section ...>` call site in this file to remove the `label` prop:

- `<Section label="Account" title="Who's signed in">` → `<Section title="Who's signed in">`
- `<Section label="Appearance" title="Theme">` → `<Section title="Theme">`
- `<Section label="Feedback" title="Tell us what's working">` → `<Section title="Tell us what's working">`
- `<Section label="Session" title="Sign out of Ibid">` → `<Section title="Sign out of Ibid">`

- [ ] **Step 2: Also drop the page's "Preferences" eyebrow in the header**

In the same file, find the header block (around line 30-45). The current heading includes a `<p className="label mb-4">Preferences</p>` eyebrow above "Settings." Remove it — the `<h1>Settings.</h1>` carries the hierarchy alone.

Remove this line:

```tsx
<p className="label mb-4">Preferences</p>
```

- [ ] **Step 3: Drop border-y on the account info row**

In the same file, find the account info `<div className="flex items-center gap-4 border-y border-rule py-6">` (around line 55). Replace className:

```tsx
<div className="flex items-center gap-4 py-1">
```

- [ ] **Step 4: Drop border-y on the session/sign-out wrapper**

Find `<div className="border-y border-rule py-6">` inside the "Session" section (around line 99). Replace:

```tsx
<div className="pt-2">
```

- [ ] **Step 5: Bump section spacing**

In the same file, find `<div className="space-y-10">` wrapping the four `<Section>` calls (around line 50). Change to:

```tsx
<div className="space-y-14">
```

- [ ] **Step 6: Drop border-y in components/settings/feedback-card.tsx**

In `components/settings/feedback-card.tsx`, find:

```tsx
<div className="border-y border-rule py-4">
```

Replace with:

```tsx
<div className="py-2">
```

- [ ] **Step 7: Drop border-y in components/settings/theme-card.tsx**

In `components/settings/theme-card.tsx`, find:

```tsx
<fieldset className="border-y border-rule py-6">
```

Replace with:

```tsx
<fieldset className="py-2">
```

- [ ] **Step 8: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: clean. If the Section helper's removed `label` prop triggers a biome unused-prop warning, ensure all call sites were updated (Step 1).

- [ ] **Step 9: Probe dev server**

Visit `http://localhost:6769/settings` (authenticated). Expected:
- No "PREFERENCES" eyebrow above "Settings."
- No "ACCOUNT" / "APPEARANCE" / "FEEDBACK" / "SESSION" eyebrow labels
- No hairlines extending from labels
- Account info row has NO top/bottom border, just spacing
- Theme buttons fieldset has NO top/bottom border
- Feedback card has NO top/bottom border
- Sections feel separated by whitespace alone; page reads cleanly

- [ ] **Step 10: Commit**

```bash
git add app/settings/page.tsx components/settings/feedback-card.tsx components/settings/theme-card.tsx
git commit -m "refactor(settings): drop editorial eyebrows + decorative borders"
```

---

## Task 5 — Swap FeedbackWidget emoji faces for Lucide mono icons

**Files:**
- Modify: `components/ui/feedback-widget.tsx` — replace the inline SVG emoji icons in the `EMOJIS` array with Lucide components

- [ ] **Step 1: Add Lucide imports at the top of feedback-widget.tsx**

Find the existing imports (currently: React, Radix toggle-group, motion/react, ReactMarkdown, cn). Add:

```tsx
import { Frown, Laugh, Meh, Smile } from 'lucide-react';
```

- [ ] **Step 2: Replace the EMOJIS array**

Find the `const EMOJIS = [...]` block at the top of the file (around line 7-102). The current four entries have hand-drawn SVG `icon` fields. Replace the whole array:

```tsx
const EMOJIS = [
  {
    id: 'very-sad',
    label: 'Terrible',
    icon: <Frown className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  },
  {
    id: 'sad',
    label: 'Bad',
    icon: <Meh className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  },
  {
    id: 'neutral',
    label: 'Okay',
    icon: <Smile className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  },
  {
    id: 'happy',
    label: 'Amazing',
    icon: <Laugh className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
  },
];
```

(The four ids and labels stay identical so the `onSubmit({ rating })` payload shape is unchanged.)

- [ ] **Step 3: Update the ToggleGroup.Item render to drop the inner motion wrapper if needed**

The existing render wraps each icon in `<motion.div layout="position" ...>`. That still works — the Lucide component becomes the child. No change needed there. Verify the existing Item render still looks like:

```tsx
<ToggleGroup.Item
  key={emoji.id}
  value={emoji.id}
  title={emoji.label}
  className={...}
>
  <motion.div
    layout="position"
    transition={springTransition}
    className="relative z-10 flex h-5 w-5 scale-110 items-center justify-center transition-transform active:scale-90"
  >
    {emoji.icon}
  </motion.div>
  {value === emoji.id && (...)}
</ToggleGroup.Item>
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: clean. No unused-import warnings if all four Lucide icons are referenced in the array.

- [ ] **Step 5: Probe dev server**

Visit `http://localhost:6769/settings`. In the "Tell us what's working" section, four monochrome Lucide faces should appear in the row — no more colored cartoon emojis. Clicking each should highlight with the existing active-pill behaviour.

- [ ] **Step 6: Commit**

```bash
git add components/ui/feedback-widget.tsx
git commit -m "style(feedback): swap emoji SVGs for monochrome lucide faces"
```

---

## Task 6 — Soften stats grid borders in admin + overview

**Files:**
- Modify: `app/admin/documents/page.tsx:49` — drop outer `border-y border-rule`, tint `divide-x`
- Modify: `app/overview/page.tsx:37` — same

- [ ] **Step 1: Update admin stats grid**

In `app/admin/documents/page.tsx`, find:

```tsx
<div className="grid divide-x divide-rule border-y border-rule sm:grid-cols-3">
```

Replace with:

```tsx
<div className="grid divide-x divide-border/60 sm:grid-cols-3">
```

- [ ] **Step 2: Update overview stats grid**

In `app/overview/page.tsx`, find the same pattern (around line 37):

```tsx
<div className="mt-12 grid divide-x divide-rule border-y border-rule sm:grid-cols-3">
```

Replace with:

```tsx
<div className="mt-12 grid divide-x divide-border/60 sm:grid-cols-3">
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: clean.

- [ ] **Step 4: Probe dev server**

Visit `http://localhost:6769/admin/documents` (admin-only) and `http://localhost:6769/overview`. Expected:
- The top stats strip shows three columns separated by a faint vertical line (semi-transparent)
- No top or bottom horizontal border framing the strip
- The document list in `/admin/documents` still has its row dividers (those are untouched)

- [ ] **Step 5: Commit**

```bash
git add app/admin/documents/page.tsx app/overview/page.tsx
git commit -m "style(stats): soften grid borders — drop outer frame, tint column divider"
```

---

## Task 7 — Trim landing stats sidebar from 3 rows to 2

**Files:**
- Modify: `app/page.tsx` — remove the "Generation · Gemma 4 · local" `<SpecRow>`

- [ ] **Step 1: Remove the Generation row**

In `app/page.tsx`, find the sidebar stats block (around line 95-100):

```tsx
<dl className="divide-y divide-rule border-y border-rule">
  <SpecRow term="Retrieval" value="pgvector · top-K 8" />
  <SpecRow term="Generation" value="Gemma 4 · local" />
  <SpecRow term="Safeguards" value="3-layer grounding" />
</dl>
```

Remove the middle line so it becomes:

```tsx
<dl className="divide-y divide-rule border-y border-rule">
  <SpecRow term="Retrieval" value="pgvector · top-K 8" />
  <SpecRow term="Safeguards" value="3-layer grounding" />
</dl>
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `pnpm typecheck && pnpm lint`

Expected: clean.

- [ ] **Step 3: Probe dev server**

Visit `http://localhost:6769/` (signed out, landing renders). The right sidebar now shows two spec rows (Retrieval / Safeguards) instead of three. Layout stays balanced.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "style(landing): trim stats sidebar from 3 rows to 2"
```

---

## Task 8 — Final validation pass

No code changes. Just confirm the full app still builds, tests pass, and every affected route renders without layout shift.

**Files:** none modified.

- [ ] **Step 1: Run the full typecheck**

Run: `pnpm typecheck`

Expected: `tsc --noEmit` returns exit 0 with no errors.

- [ ] **Step 2: Run the full lint**

Run: `pnpm lint`

Expected: `biome check .` reports "No fixes applied" across every file. If anything is flagged, run `pnpm exec biome check --write` on the offending file then re-lint.

- [ ] **Step 3: Run the full unit test suite**

Run: `pnpm test`

Expected: 33+ tests pass (existing tests + 6 new UserAvatar tests = 39 passing). The RAG-eval integration file stays skipped (no `RAG_LIVE_TESTS=1`).

- [ ] **Step 4: Probe every affected route on the dev server**

With the dev server running on port 6769, hit:

```bash
curl -sS -o /dev/null -w "landing: %{http_code}\n"  "http://localhost:6769/"
curl -sS -o /dev/null -w "signin:  %{http_code}\n"  "http://localhost:6769/sign-in"
curl -sS -o /dev/null -w "chat:    %{http_code}\n"  "http://localhost:6769/chat"
curl -sS -o /dev/null -w "settings: %{http_code}\n" "http://localhost:6769/settings"
curl -sS -o /dev/null -w "overview: %{http_code}\n" "http://localhost:6769/overview"
curl -sS -o /dev/null -w "admin:   %{http_code}\n"  "http://localhost:6769/admin/documents"
```

Expected:
- `/` → 200 (public landing)
- `/sign-in` → 200 (public sign-in)
- `/chat` → 307 → `/sign-in?returnTo=/chat` (auth-gated; authenticated browser gets 200)
- `/settings` → 307 → `/sign-in?returnTo=/settings` (same)
- `/overview` → 307 or 200 depending on auth
- `/admin/documents` → 307 or 404 (admin-gated)

- [ ] **Step 5: Open an authenticated browser session and walk every page**

In the browser:

1. Sign in with Google
2. **`/chat`**: send a message, verify user avatar on left of question, Ibid knot on left of response, no hairline dividers between speaker turns
3. **`/settings`**: verify four sections separated by whitespace only, no eyebrow labels, monochrome feedback icons, sign-out button works
4. **`/overview`**: stats strip shows three columns separated by faint vertical divider, no outer frame, paper cards grid renders
5. **`/admin/documents`** (if admin): same stats softening, document list still has row dividers intact
6. **`/`** (sign out first, then hit landing): aurora hero renders, sidebar shows Retrieval + Safeguards (no Generation row), liquid-glass CTA works

- [ ] **Step 6: Commit any final formatting nits**

If the validation pass found formatting/lint issues that got auto-fixed, stage and commit them:

```bash
git add -A
git commit -m "chore: auto-format after redesign pass"
```

If nothing was auto-fixed, skip this commit.

---

## Testing Reference — what's covered by what

| Change category | Coverage |
|---|---|
| UserAvatar logic (initials / image / edge cases) | Vitest unit tests (`components/chat/user-avatar.test.ts`, 6 cases) |
| Prop threading through ChatShell stack | TypeScript compiler — types enforce the prop surface |
| Chat message avatar rendering | Manual dev-server probe (Task 3 Step 5) |
| Settings page typography-only layout | Manual dev-server probe (Task 4 Step 9) |
| Feedback widget icon swap | Manual dev-server probe (Task 5 Step 5) |
| Stats grid softening | Manual dev-server probe (Task 6 Step 4) |
| Landing sidebar trim | Manual dev-server probe (Task 7 Step 3) |
| Site-wide regression | Full test suite + curl probe sweep (Task 8) |

Component-rendering tests for the chat message layout are intentionally deferred — the project's vitest config runs in node env without JSDOM, and adding a React Testing Library layer for this one-off visual change is out of scope. Manual dev-server probes catch layout bugs fine for a small, focused refactor.

---

## Rollback

Each task produces one commit, so any single change can be reverted independently:

```bash
git log --oneline -n 7 main..HEAD
# pick the commit to drop
git revert <sha>
```

If the whole pass needs rolling back, revert in reverse task order (Task 8 has no commit; Tasks 7 → 6 → 5 → 4 → 3 → 2 → 1).

No schema migrations, no new runtime dependencies, no env-var changes.
