'use client';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Self-host the worker from public/. The `new URL(..., import.meta.url)`
// pattern that works with webpack doesn't resolve node_modules assets
// under Turbopack, so we keep a copy of pdf.worker.min.mjs in public/
// and serve it directly. The postinstall script (scripts/sync-pdf-
// worker.mjs) keeps it in sync with the installed pdfjs-dist version.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// 1× = 400px-wide preview. Pre-rendered at integer multiples below so
// pdfjs doesn't re-raster on every click — it hits cache for the
// standard zoom steps.
const BASE_WIDTH = 400;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

function clampScale(s: number): number {
  const rounded = Math.round(s * 100) / 100;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, rounded));
}

export function PdfViewer({ documentId, page }: { documentId: string; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    (async () => {
      const res = await fetch(`/api/pdf-url?documentId=${documentId}`);
      if (!res.ok) {
        if (!cancelled) {
          // Prefer a warm, informative message over the raw status. 404
          // = storage drift (rare), 401 = session expired, 5xx = server
          // hiccup. In every case the recovery for the user is the same
          // — try another source — so we route all failures to one
          // friendly message and show the status for debugging only.
          setError(
            "This passage isn't available right now. Try another citation, or refresh the page.",
          );
        }
        return;
      }
      const json = (await res.json()) as { url: string };
      if (!cancelled) setUrl(json.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Reset zoom when citation changes — different papers may have
  // different natural sizes; 100% is the right place to start.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on citation switch
  useEffect(() => {
    setScale(1);
  }, [documentId, page]);

  const zoomIn = () => setScale((s) => clampScale(s + SCALE_STEP));
  const zoomOut = () => setScale((s) => clampScale(s - SCALE_STEP));
  const zoomReset = () => setScale(1);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        <div className="text-center">
          <p className="label mb-2 text-destructive">Unavailable</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-xs italic text-muted-foreground">
        Fetching passage\u2026
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="h-full overflow-auto bg-[#d9d3c0]/50 p-4">
        <div className="mx-auto w-fit shadow-[0_12px_32px_-16px_rgba(26,31,44,0.45)]">
          <Document
            file={url}
            loading={<div className="p-8 text-xs italic text-muted-foreground">Loading\u2026</div>}
            error={<div className="p-8 text-xs text-destructive">Could not render PDF.</div>}
          >
            <Page
              pageNumber={page}
              width={BASE_WIDTH * scale}
              // Text layer on = users can select and copy cited passages
              // directly from the PDF preview. This is the core "every
              // footnote opens the exact page" value prop — if the page
              // were a flat image, a demo audience couldn't verify quotes.
              renderTextLayer={true}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>

      {/* Zoom pill — floats bottom-right of the viewer, always visible
          regardless of how far the user has scrolled the page. */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center rounded-full border border-foreground bg-background shadow-[0_10px_28px_-14px_rgba(0,0,0,0.3)]">
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-l-full text-foreground transition hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-35"
        >
          <ZoomOut className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          aria-label={`Reset zoom (currently ${Math.round(scale * 100)}%)`}
          title="Reset zoom"
          className="h-9 border-foreground border-x px-3 font-mono text-[10px] tabular-nums uppercase tracking-[0.18em] text-foreground transition hover:bg-foreground hover:text-background"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-r-full text-foreground transition hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-35"
        >
          <ZoomIn className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
