#!/usr/bin/env node
/**
 * Copies pdfjs-dist's worker bundle into public/ so the PDF side panel
 * can load it as a static asset (Turbopack can't resolve node_modules
 * assets via new URL(..., import.meta.url)). Runs automatically after
 * `pnpm install` via the postinstall hook — keeps public/pdf.worker
 * in lockstep with the installed pdfjs-dist version.
 *
 * Under pnpm's strict layout, pdfjs-dist lives at
 * node_modules/.pnpm/pdfjs-dist@X.Y.Z/node_modules/pdfjs-dist/...
 * so plain require.resolve from this script won't reach it. We glob
 * instead, picking the first matching worker file.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const candidates = [
  // Plain layout (npm / yarn classic)
  join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
];

// pnpm layout — node_modules/.pnpm/pdfjs-dist@X.Y.Z/node_modules/pdfjs-dist/build/...
const pnpmRoot = join(projectRoot, 'node_modules', '.pnpm');
try {
  for (const entry of readdirSync(pnpmRoot)) {
    if (!entry.startsWith('pdfjs-dist@')) continue;
    const worker = join(
      pnpmRoot,
      entry,
      'node_modules',
      'pdfjs-dist',
      'build',
      'pdf.worker.min.mjs',
    );
    try {
      if (statSync(worker).isFile()) candidates.push(worker);
    } catch {
      /* skip */
    }
  }
} catch {
  /* node_modules/.pnpm doesn't exist — not a pnpm install */
}

let src = null;
for (const c of candidates) {
  try {
    if (statSync(c).isFile()) {
      src = c;
      break;
    }
  } catch {
    /* try next */
  }
}

if (!src) {
  console.warn(
    '[sync-pdf-worker] pdfjs-dist worker not found; skipping (install may not have completed).',
  );
  process.exit(0);
}

const dest = join(projectRoot, 'public', 'pdf.worker.min.mjs');
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-pdf-worker] ${src} -> ${dest}`);
