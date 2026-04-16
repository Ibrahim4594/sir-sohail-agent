import { NextResponse } from 'next/server';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'file required' }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const storagePath = `corpus/${Date.now()}-${file.name}`;

  const { error: upErr } = await supabase.storage.from('pdfs').upload(storagePath, buf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const result = await ingestDocument({
    filename: file.name,
    title: file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '),
    storagePath,
    uploadedBy: user.id,
    data: buf,
  });

  return NextResponse.json({ ok: true, ...result });
}
