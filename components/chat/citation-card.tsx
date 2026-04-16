'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UIMessage } from './types';

type Citation = NonNullable<UIMessage['citations']>[number];

export function CitationCard({
  citation,
  onOpen,
}: {
  citation: Citation;
  onOpen: (c: Citation) => void;
}) {
  if (!citation.valid) {
    return (
      <Card className="border-yellow-300 bg-yellow-50 text-xs">
        <CardContent className="p-2">
          <Badge variant="outline" className="mr-2">
            [{citation.marker}]
          </Badge>
          Unverified citation — this claim could not be mapped back to a source.
        </CardContent>
      </Card>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(citation)}
      className={cn(
        'group w-full rounded-md border bg-card p-2 text-left text-xs transition hover:bg-accent',
      )}
    >
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className="shrink-0">
          [{citation.marker}]
        </Badge>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-medium">{citation.documentTitle}</div>
          <div className="text-muted-foreground">Page {citation.pageNumber}</div>
          <div className="line-clamp-3 text-muted-foreground">{citation.snippet}</div>
        </div>
      </div>
    </button>
  );
}
