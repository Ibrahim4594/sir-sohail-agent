alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy "self can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "self can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());
create policy "authenticated can read documents"
  on public.documents for select to authenticated using (true);
create policy "admins can insert documents"
  on public.documents for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "admins can update documents"
  on public.documents for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "authenticated can read chunks"
  on public.chunks for select to authenticated using (true);
create policy "admins can insert chunks"
  on public.chunks for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "users can manage own conversations"
  on public.conversations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "users can select own messages"
  on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "users can insert into own conversations"
  on public.messages for insert to authenticated
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
