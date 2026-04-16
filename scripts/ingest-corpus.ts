import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

async function main() {
  const pdfDir = path.resolve('pdfs');
  const files = (await readdir(pdfDir)).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDFs in ${pdfDir}`);

  const supabase = createServiceRoleSupabase();

  for (const filename of files) {
    console.log(`\n-> ${filename}`);
    const fullPath = path.join(pdfDir, filename);
    const data = await readFile(fullPath);

    const storagePath = `corpus/${filename}`;
    const { error: upErr } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, data, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      console.error(`  upload failed: ${upErr.message}`);
      continue;
    }
    console.log(`  uploaded -> ${storagePath}`);

    try {
      const res = await ingestDocument({
        filename,
        title: prettyTitle(filename),
        storagePath,
        data: new Uint8Array(data),
      });
      console.log(`  ingested: ${res.chunkCount} chunks (doc ${res.documentId})`);
    } catch (e) {
      console.error(`  ingest failed:`, e);
    }
  }

  console.log('\nDone.');
}

function prettyTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
