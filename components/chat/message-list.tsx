'use client';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from './message';
import type { Citation, UIMessage } from './types';

export function MessageList({
  messages,
  onOpenCitation,
  avatarUrl,
  displayName,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: Citation) => void;
  avatarUrl?: string | null;
  displayName?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // `sticky` mirrors whether the bottom sentinel is visible. While
  // sticky the viewport follows streaming text; when the user scrolls
  // up (sentinel leaves), auto-scroll stops immediately — no more
  // fighting the user over 180px. Once they scroll back to the
  // bottom (or press the Jump-to-latest button), it resumes. The
  // previous distance-based check was the real cause of the "stuck
  // scroll during streaming" complaint.
  const [sticky, setSticky] = useState(true);

  const lastContent = messages[messages.length - 1]?.content ?? '';
  const count = messages.length;
  const prevCountRef = useRef(count);

  // Initial mount — snap to bottom without animation so opening a
  // conversation doesn't start mid-history.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, []);

  // Watch the sentinel. A 120px bottom margin means "almost at the
  // bottom" also counts as sticky, so the last paragraph doesn't
  // flicker in and out as it grows.
  useEffect(() => {
    const root = containerRef.current;
    const sentinel = bottomRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => setSticky(entries[0]?.isIntersecting ?? false),
      { root, threshold: 0, rootMargin: '0px 0px 120px 0px' },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // User just sent a new message — they almost always want to watch
  // the reply stream in, so force-stick on.
  useEffect(() => {
    if (count > prevCountRef.current) {
      prevCountRef.current = count;
      setSticky(true);
    }
  }, [count]);

  // Stream chunks: only scroll when sticky. behavior: 'auto' (instant)
  // prevents multiple smooth-scroll animations queuing up and canceling
  // each other during a fast streaming burst.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire on every content/sticky change
  useEffect(() => {
    if (!sticky) return;
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [lastContent, sticky]);

  const jumpToLatest = useCallback(() => {
    setSticky(true);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  return (
    <div className="relative h-full">
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
              avatarUrl={avatarUrl}
              displayName={displayName}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {!sticky && (
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-foreground bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] transition hover:bg-foreground hover:text-background"
        >
          <ChevronDown className="size-3" strokeWidth={2} aria-hidden />
          Latest
        </button>
      )}
    </div>
  );
}
