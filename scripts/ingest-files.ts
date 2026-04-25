/**
 * Ingest specific PDF files (one-off helper).
 *
 * Companion to `scripts/ingest-corpus.ts`, which iterates the whole
 * `pdfs/` directory. Use this when you want to add a small batch of
 * new PDFs to an existing corpus without re-ingesting everything that
 * already lives in Supabase.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/ingest-files.ts \
 *     pdfs/foo.pdf pdfs/bar.pdf "pdfs/with spaces.pdf"
 *
 * Each file is uploaded to the `pdfs` Storage bucket under
 * `corpus/<filename>` (upserted, so re-runs are safe), then parsed,
 * section-tagged, chunked, embedded, and inserted into `documents` +
 * `chunks` via the same `ingestDocument()` used by the bulk script.
 *
 * IMPORTANT: this does NOT dedupe against existing rows. If you pass
 * a filename that's already been ingested, you'll create a duplicate
 * document. Wipe the old row first if you want to replace it.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

async function main() {
  const args = process.argv.slice(2).filter((a) => a.toLowerCase().endsWith('.pdf'));
  if (args.length === 0) {
    console.error('Usage: tsx scripts/ingest-files.ts <pdf1> [pdf2 ...]');
    process.exit(1);
  }

  console.log(`Ingesting ${args.length} PDF(s)`);
  const supabase = createServiceRoleSupabase();

  let ok = 0;
  let failed = 0;

  for (const filepath of args) {
    const filename = path.basename(filepath);
    console.log(`\n-> ${filename}`);
    try {
      const data = await readFile(filepath);
      const storagePath = `corpus/${filename}`;
      const { error: upErr } = await supabase.storage
        .from('pdfs')
        .upload(storagePath, data, { contentType: 'application/pdf', upsert: true });
      if (upErr) {
        console.error(`  upload failed: ${upErr.message}`);
        failed++;
        continue;
      }
      console.log(`  uploaded -> ${storagePath}`);

      const res = await ingestDocument({
        filename,
        title: prettyTitle(filename),
        storagePath,
        data: new Uint8Array(data),
      });
      console.log(`  ingested: ${res.chunkCount} chunks (doc ${res.documentId})`);
      ok++;
    } catch (e) {
      console.error('  ingest failed:', e);
      failed++;
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`);
  if (failed > 0) process.exit(1);
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
