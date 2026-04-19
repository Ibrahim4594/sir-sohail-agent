-- Add pin-to-top support for conversations.
alter table public.conversations
  add column if not exists pinned_at timestamptz;
-- Optimise the sidebar query: pinned first (newest-pinned on top),
-- then everything else by recency.
create index if not exists conversations_user_pinned_updated_idx
  on public.conversations (user_id, pinned_at desc nulls last, updated_at desc);
