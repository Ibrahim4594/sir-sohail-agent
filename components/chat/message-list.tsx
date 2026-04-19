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
  onRegenerate,
}: {
  messages: UIMessage[];
  onOpenCitation: (c: Citation) => void;
  avatarUrl?: string | null;
  displayName?: string;
  onRegenerate?: () => void;
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
  //
  // RAF-coalesce: even after the chat-shell token-buffer throttles
  // content updates to ~20/sec, re-renders can still back up during
  // a burst. We schedule at most one scrollIntoView per frame so the
  // main thread isn't kept busy thrashing layout. Pattern: ChatGPT
  // and Claude both coalesce follow-scroll this way.
  const scrollScheduledRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire on every content/sticky change
  useEffect(() => {
    if (!sticky) return;
    if (scrollScheduledRef.current) return;
    scrollScheduledRef.current = true;
    const raf = window.requestAnimationFrame(() => {
      scrollScheduledRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
    return () => window.cancelAnimationFrame(raf);
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
        // scrollbarGutter: prevents the thumb from taking/giving width
        // on overflow changes, which otherwise causes horizontal jitter
        // during streaming.
        // overflowAnchor: default-'auto' enables Chrome's native scroll
        // anchoring — when content above the viewport grows, the
        // browser preserves the user's visual position. Pairs with
        // the non-anchoring sentinel below so our follow-scroll
        // still works.
        style={{ scrollbarGutter: 'stable', overflowAnchor: 'auto' }}
      >
        <div className="pb-48 pt-6">
          {messages.map((m, i) => {
            // The Regenerate action only applies to the most recent
            // assistant turn — and only once it's settled, not mid-
            // stream. The Message component double-checks the
            // streaming flag before rendering the button.
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1;
            return (
              <Message
                key={m.id}
                message={m}
                onOpenCitation={onOpenCitation}
                isFirst={i === 0 || messages[i - 1]?.role !== 'assistant'}
                avatarUrl={avatarUrl}
                displayName={displayName}
                isLastAssistant={isLastAssistant}
                onRegenerate={onRegenerate}
              />
            );
          })}
          {/* Sentinel is not an anchor candidate — keeps follow-scroll
              crisp even with overflowAnchor enabled above. */}
          <div ref={bottomRef} style={{ overflowAnchor: 'none' }} />
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
