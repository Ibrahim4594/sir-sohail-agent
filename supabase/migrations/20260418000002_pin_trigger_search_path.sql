-- P1 — Pin search_path on the touch_conversation trigger function.
--
-- Context:
--   Trigger functions without a pinned search_path can be influenced
--   by role-specific search_path settings. In multi-schema setups, a
--   user who can create objects in any searched schema could shadow
--   `public.conversations` with their own table and redirect the
--   UPDATE. The risk is low in this single-schema project but the
--   hardening is cheap and standard.
--
-- Fix:
--   Redefine with SECURITY DEFINER + SET search_path = public, pg_temp.
--   Matches the pattern already used for public.handle_new_user().

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
