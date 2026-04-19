insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;
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
