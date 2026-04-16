'use client';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Pinned to the installed pdfjs-dist version to avoid CDN/version drift.
const PDFJS_VERSION = '5.4.296';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export function PdfViewer({ documentId, page }: { documentId: string; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    (async () => {
      const res = await fetch(`/api/pdf-url?documentId=${documentId}`);
      if (!res.ok) {
        if (!cancelled) setError(`Could not load PDF (${res.status})`);
        return;
      }
      const json = (await res.json()) as { url: string };
      if (!cancelled) setUrl(json.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

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
    <div className="h-full overflow-auto bg-[#d9d3c0]/50 p-4">
      <div className="mx-auto w-fit shadow-[0_12px_32px_-16px_rgba(26,31,44,0.45)]">
        <Document
          file={url}
          loading={<div className="p-8 text-xs italic text-muted-foreground">Loading\u2026</div>}
          error={<div className="p-8 text-xs text-destructive">Could not render PDF.</div>}
        >
          <Page
            pageNumber={page}
            width={400}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}
