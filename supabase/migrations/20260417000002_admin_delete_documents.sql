-- Explicit DELETE policy for the documents table.
--
-- Previously there was no DELETE policy at all, which meant RLS's
-- default-deny kept the endpoint locked but the absence was a security
-- smell — future developers might assume delete is open, or authorise
-- it without realising the policy never existed. This makes the intent
-- explicit: only admins may delete a document row. Related chunks are
-- removed by the ON DELETE CASCADE on chunks.document_id.

create policy "admins can delete documents"
  on public.documents for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Mirror the same admin-only gate on chunks so a stray direct delete
-- without going through the parent document is still locked down.
create policy "admins can delete chunks"
  on public.chunks for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
