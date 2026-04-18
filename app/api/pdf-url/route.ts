import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';

const DocumentIdSchema = z.string().uuid();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('documentId');
  if (!raw) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  // Validate before the DB round-trip so a malformed id returns 400
  // instead of hitting Postgres only to be rejected as a missing row.
  const parsed = DocumentIdSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'documentId must be a valid UUID' }, { status: 400 });
  }
  const documentId = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(doc.storage_path, 600);
  if (error || !signed) return NextResponse.json({ error: error?.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
