'use client';
import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import type { Citation } from './types';

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
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-foreground bg-background shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.25)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-rule px-6 py-5">
            <div className="min-w-0">
              <p className="label label--ink">
                Source [{String(citation.marker).padStart(2, '0')}] · Page {citation.pageNumber}
              </p>
              <h3 className="mt-2.5 truncate font-display text-[20px] leading-[1.2] tracking-[-0.008em] text-foreground">
                {citation.documentTitle ?? citation.documentFilename}
              </h3>
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {citation.documentFilename}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="shrink-0 border border-foreground bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition hover:bg-foreground hover:text-background"
            >
              Close
            </button>
          </header>

          {citation.snippet && (
            <blockquote className="border-b border-rule bg-muted px-6 py-4">
              <p className="label mb-2">Cited passage</p>
              <p className="font-display text-[15px] italic leading-[1.55] text-foreground">
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
