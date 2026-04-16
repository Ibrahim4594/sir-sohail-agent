'use client';
import { cn } from '@/lib/utils';
import { CitationCard } from './citation-card';
import type { UIMessage } from './types';

export function MessageItem({
  message,
  onOpenCitation,
}: {
  message: UIMessage;
  onOpenCitation: (c: NonNullable<UIMessage['citations']>[number]) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex w-full gap-3 py-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] space-y-2 rounded-lg px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content || '…'}</div>
        {message.citations && message.citations.length > 0 && (
          <div className="space-y-1.5">
            {message.citations.map((c) => (
              <CitationCard
                key={`${message.id}-${c.marker}`}
                citation={c}
                onOpen={onOpenCitation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
