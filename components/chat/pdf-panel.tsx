'use client';
import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import type { Citation } from './types';

/**
 * react-pdf evaluates pdfjs-dist at import time which touches DOMMatrix
 * (browser-only). Dynamic-load with ssr:false so SSR doesn't choke.
 */
const PdfViewer = dynamic(() => import('@/components/chat/pdf-viewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="p-6 text-xs text-muted-foreground">Loading viewer\u2026</div>,
});

export function PdfPanel({
  citation,
  onClose,
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  const open = !!(citation?.documentId && citation.pageNumber);

  return (
    <AnimatePresence mode="wait">
      {open && citation?.documentId && citation.pageNumber && (
        <motion.aside
          key={citation.chunkId ?? `${citation.marker}`}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-foreground/15 bg-card shadow-[-16px_0_50px_-24px_rgba(26,31,44,0.35)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-foreground/10 px-5 py-4">
            <div className="min-w-0">
              <p className="label text-[var(--oxblood)]">
                Source [{citation.marker}] · Page {citation.pageNumber}
              </p>
              <h3 className="mt-1.5 truncate font-display text-lg italic leading-snug text-foreground">
                {citation.documentTitle ?? citation.documentFilename}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {citation.documentFilename}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="shrink-0 rounded-md border border-foreground/15 px-2.5 py-1.5 text-xs transition hover:border-[var(--oxblood)] hover:text-[var(--oxblood)]"
            >
              Close
            </button>
          </header>

          {citation.snippet && (
            <blockquote className="border-l-2 border-[var(--oxblood)] bg-[var(--oxblood)]/[0.04] px-4 py-3">
              <p className="label mb-1">Cited passage</p>
              <p className="font-display text-[14px] leading-relaxed italic text-foreground/90">
                {`\u201C${citation.snippet.trim().replace(/\s+/g, ' ').slice(0, 280)}${citation.snippet.length > 280 ? '\u2026' : ''}\u201D`}
              </p>
            </blockquote>
          )}

          <div className="flex-1 overflow-hidden">
            <PdfViewer documentId={citation.documentId} page={citation.pageNumber} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
