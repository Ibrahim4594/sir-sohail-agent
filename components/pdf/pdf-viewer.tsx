'use client';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Pin to the installed pdfjs-dist version to avoid runtime resolution issues
const PDFJS_VERSION = '5.4.296';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export function PdfViewer({ documentId, page }: { documentId: string; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/pdf-url?documentId=${documentId}`);
      if (!res.ok) return;
      const json = (await res.json()) as { url: string };
      if (!cancelled) setUrl(json.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!url) return <div className="p-4 text-xs text-muted-foreground">Loading PDF…</div>;

  return (
    <div className="h-full overflow-auto">
      <Document file={url} loading={<div className="p-4 text-xs">Loading…</div>}>
        <Page pageNumber={page} width={380} />
      </Document>
    </div>
  );
}
