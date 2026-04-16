'use client';
import { Button } from '@/components/ui/button';
import { PdfViewer } from './pdf-viewer';

type PanelCitation = {
  documentId: string | null;
  documentFilename: string | null;
  documentTitle: string | null;
  pageNumber: number | null;
  snippet: string | null;
};

export function PdfSidePanel({
  citation,
  onClose,
}: {
  citation: PanelCitation | null;
  onClose: () => void;
}) {
  if (!citation?.documentId || !citation.pageNumber) {
    return <aside className="hidden border-l bg-muted/10 lg:block" />;
  }
  return (
    <aside className="hidden h-full flex-col border-l bg-muted/10 lg:flex">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{citation.documentTitle}</div>
          <div className="text-xs text-muted-foreground">Page {citation.pageNumber}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="border-b bg-yellow-50 p-2 text-xs">
        <span className="font-semibold">Cited snippet:</span> {citation.snippet}
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfViewer documentId={citation.documentId} page={citation.pageNumber} />
      </div>
    </aside>
  );
}
