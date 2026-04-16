'use client';
import { useEffect, useRef } from 'react';
import { Message } from './message';
import type { Citation, UIMessage } from './types';

export function MessageList({
  messages,
  onOpenCitation,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: Citation) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages or streamed chunks arrive,
  // unless the user has scrolled up manually.
  const lastContent = messages[messages.length - 1]?.content ?? '';
  const count = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on count or latest content change
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const distanceFromBottom = c.scrollHeight - c.clientHeight - c.scrollTop;
    if (distanceFromBottom < 180) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [count, lastContent]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{ scrollbarGutter: 'stable' }}
    >
      <div className="pb-48 pt-6">
        {messages.map((m, i) => (
          <Message
            key={m.id}
            message={m}
            onOpenCitation={onOpenCitation}
            isFirst={i === 0 || messages[i - 1]?.role !== 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
