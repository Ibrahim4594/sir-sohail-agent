import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    pin: z.boolean().optional(),
  })
  .refine((b) => b.title !== undefined || b.pin !== undefined, {
    message: 'Provide at least one of {title, pin}',
  });

async function requireAuthedConversation(id: string) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[conversations] unauthorised request — no session');
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Validate the id up front so a malformed UUID returns 400 instead of
  // hitting the DB only to be rejected — and distinguishes a bad URL
  // from a genuine "not found".
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    console.warn('[conversations] malformed id on request:', id);
    return { error: NextResponse.json({ error: 'Invalid id' }, { status: 400 }) };
  }

  // maybeSingle() — no-row is null instead of an error, so we can
  // distinguish a real DB failure from "that id doesn't exist" cleanly.
  const { data: row, error: lookupErr } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr) {
    console.error('[conversations] lookup failed for id %s: %o', id, lookupErr);
    return { error: NextResponse.json({ error: lookupErr.message }, { status: 500 }) };
  }
  if (!row) {
    console.warn(
      '[conversations] id %s not visible to user %s (either deleted or RLS hid it)',
      id,
      user.id,
    );
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  if (row.user_id !== user.id) {
    console.warn(
      '[conversations] user %s attempted to access %s owned by %s',
      user.id,
      id,
      row.user_id,
    );
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { supabase };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const authed = await requireAuthedConversation(id);
  if ('error' in authed) return authed.error;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const patch: { title?: string; pinned_at?: string | null } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.pin !== undefined) {
    patch.pinned_at = parsed.data.pin ? new Date().toISOString() : null;
  }

  const { error } = await authed.supabase.from('conversations').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const authed = await requireAuthedConversation(id);
  if ('error' in authed) return authed.error;

  const { error } = await authed.supabase.from('conversations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
