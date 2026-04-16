import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const documentId = url.searchParams.get('documentId');
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

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
