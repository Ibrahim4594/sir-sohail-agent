import { NextResponse } from 'next/server';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Caps on ingestion. A 50 MB ceiling fits every realistic academic PDF
// (dissertations top out around 15 MB) and prevents an admin key leak
// from being escalated into a cost / memory DoS. The magic-byte check
// rejects anything that isn't a real PDF before we waste parser, chunker,
// and embedding calls on junk content.
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

function looksLikePdf(buf: Uint8Array): boolean {
  if (buf.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (buf[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

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

  // Reject oversized uploads before we touch memory.
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 50 MB max).` },
      { status: 413 },
    );
  }

  // Reject obviously-non-PDF MIME types. The browser-provided
  // content-type is advisory; we still magic-byte-check the bytes
  // below. Keeping both is cheap.
  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: `Unsupported media type: ${file.type}. PDF only.` },
      { status: 415 },
    );
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  // Magic-byte check — catches misrenamed files and the case where
  // the client sets an empty or wrong content-type.
  if (!looksLikePdf(buf)) {
    return NextResponse.json(
      { error: 'File does not look like a PDF (missing %PDF header).' },
      { status: 415 },
    );
  }

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
