/**
 * OCR-then-ingest a single scanned PDF using Gemini multimodal.
 *
 * For scanned/image-only PDFs where `unpdf.extractText` returns zero
 * characters, this script sends the raw PDF to Gemini Pro (which is
 * multimodal and natively handles PDF inputs), asks it to transcribe
 * every page verbatim, and feeds the resulting text array into the
 * normal ingestion pipeline via `ingestDocument({ prePages })`.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/ingest-ocr.ts \
 *     "pdfs/Reconstruing Educational Innovation.pdf"
 *
 * Cost: ~$0.05–$0.20 per paper depending on page count (Pro pricing,
 * input ~few thousand tokens per page when the model "reads" the
 * scanned text, plus the transcription output).
 *
 * Caveat: Gemini's transcription is high-quality on clean scans but
 * not perfect — expect occasional OCR-style errors on small print or
 * heavy bibliography pages. Spot-check the first chunk in Supabase
 * after ingestion.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ingestDocument } from '@/lib/ingest/ingest-document';
import { getChatModel } from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

const PageSchema = z.object({
  pages: z
    .array(z.string())
    .describe('One element per page, in order. Each is the verbatim text of that page.'),
});

async function ocrPdf(pdfBytes: Uint8Array): Promise<string[]> {
  const result = await generateObject({
    model: getChatModel(),
    schema: PageSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'Transcribe every page of the attached PDF, verbatim.',
              '',
              'Rules:',
              '- Return one string per page, in order, in the `pages` array.',
              '- Preserve original paragraph breaks. Use a single newline between paragraphs.',
              '- Do NOT summarise, paraphrase, or rewrite. Reproduce wording exactly as printed.',
              '- Skip running headers, page numbers, and journal mastheads.',
              '- Preserve in-text citations and footnote references as written.',
              '- If a page is genuinely blank or unreadable, return an empty string for that page.',
              '- Do NOT add commentary, instructions, or explanations of your own.',
            ].join('\n'),
          },
          {
            type: 'file',
            data: pdfBytes,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
    // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
    ...({ maxOutputTokens: 32000 } as any),
  });
  // The AI SDK widens the result type to JSONValue at the top-level
  // surface; the runtime value matches PageSchema because the SDK
  // validates against it before returning.
  const parsed = result.object as z.infer<typeof PageSchema> | null;
  if (!parsed?.pages) throw new Error('Gemini returned no structured pages');
  return parsed.pages;
}

async function main() {
  const filepath = process.argv[2];
  if (!filepath?.toLowerCase().endsWith('.pdf')) {
    console.error('Usage: tsx scripts/ingest-ocr.ts <path-to-scanned-pdf>');
    process.exit(1);
  }

  const filename = path.basename(filepath);
  console.log(`OCR + ingest: ${filename}`);

  const data = await readFile(filepath);
  const supabase = createServiceRoleSupabase();

  const storagePath = `corpus/${filename}`;
  const { error: upErr } = await supabase.storage
    .from('pdfs')
    .upload(storagePath, data, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(`upload failed: ${upErr.message}`);
  console.log(`  uploaded -> ${storagePath}`);

  console.log('  asking Gemini to transcribe...');
  const t0 = Date.now();
  const pages = await ocrPdf(new Uint8Array(data));
  console.log(`  transcribed ${pages.length} page(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const totalChars = pages.reduce((n, p) => n + (p?.length ?? 0), 0);
  console.log(`  total chars: ${totalChars}`);
  if (totalChars === 0) {
    console.error('  Gemini returned zero text — refusing to insert an empty document.');
    process.exit(1);
  }

  const res = await ingestDocument({
    filename,
    title: prettyTitle(filename),
    storagePath,
    data: new Uint8Array(data),
    prePages: pages,
  });
  console.log(`  ingested: ${res.chunkCount} chunks (doc ${res.documentId})`);
  console.log('Done.');
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
