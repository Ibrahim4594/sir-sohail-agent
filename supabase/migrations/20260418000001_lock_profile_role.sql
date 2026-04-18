-- P0 — Lock `public.profiles.role` against client-side updates.
--
-- Context:
--   The existing UPDATE policy on public.profiles is:
--     using (id = auth.uid())
--   with no WITH CHECK clause. Because the anon key is embedded in
--   every browser (NEXT_PUBLIC_SUPABASE_ANON_KEY), any authenticated
--   user could call:
--     await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
--   from the browser console and promote themselves to admin. That
--   unlocks the admin document-upload, delete, and ingest surfaces.
--
-- Fix approach:
--   Postgres WITH CHECK cannot easily reference OLD column values, so
--   we use a BEFORE UPDATE OF role trigger. The trigger rejects the
--   change when the caller's JWT role is `anon` or `authenticated`
--   (i.e., a browser client hitting PostgREST). The service_role key,
--   direct DB connections, and the supabase_admin/postgres roles all
--   retain the ability to change `role` — so the documented "promote
--   first admin via Supabase Studio SQL editor" bootstrap path in
--   CLAUDE.md continues to work.

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- auth.role() returns the request's JWT role:
  --   'anon'          — no session
  --   'authenticated' — signed-in user, anon key
  --   'service_role'  — privileged backend key
  -- Direct DB / SQL editor calls have no JWT; auth.role() returns NULL.
  if auth.role() in ('anon', 'authenticated') then
    raise exception using
      errcode = '42501',
      message = 'profiles.role may not be changed from the client';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;

create trigger prevent_profile_role_escalation
  before update of role on public.profiles
  for each row
  when (NEW.role is distinct from OLD.role)
  execute function public.prevent_profile_role_escalation();
