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
