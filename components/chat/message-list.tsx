'use client';
import { useEffect, useRef } from 'react';
import { MessageItem } from './message-item';
import type { UIMessage } from './types';

export function MessageList({
  messages,
  onOpenCitation,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: NonNullable<UIMessage['citations']>[number]) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [count]);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-6">
      {messages.map((m) => (
        <MessageItem key={m.id} message={m} onOpenCitation={onOpenCitation} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
