'use client';
import { motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { BrandMark } from '@/components/brand/mark';
import { cn } from '@/lib/utils';
import { renderInlineCitations } from './citation-ref';
import { SourcesPanel } from './sources-panel';
import type { Citation, UIMessage } from './types';
import { UserAvatar } from './user-avatar';

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function MessageImpl({
  message,
  onOpenCitation,
  avatarUrl,
  displayName,
}: {
  message: UIMessage;
  onOpenCitation: (citation: Citation) => void;
  isFirst: boolean;
  avatarUrl?: string | null;
  displayName?: string;
}) {
  const { role, content, streaming, citations, error } = message;

  // Split paragraphs once per content change; cheap but runs on every
  // streaming delta for the currently-streaming message — memo means
  // settled messages skip it entirely on re-render.
  const paragraphs = useMemo(() => splitParagraphs(content || ''), [content]);

  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
      >
        <div className="flex gap-4">
          <div className="shrink-0 pt-1" role="img" aria-label="You">
            <UserAvatar
              avatarUrl={avatarUrl ?? null}
              displayName={displayName ?? 'You'}
              className="h-6 w-6"
            />
          </div>
          <p className="flex-1 whitespace-pre-wrap font-display text-[22px] leading-[1.35] font-[400] tracking-[-0.015em] text-foreground">
            {content}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
    >
      <div className="flex gap-4">
        <div className="shrink-0 pt-1" role="img" aria-label="Ibid">
          <BrandMark className="h-6 w-6 text-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <article className={cn('space-y-5 text-[16px] leading-[1.72] text-foreground')}>
            {paragraphs.length === 0 ? (
              <p className="text-muted-foreground">
                <span className="caret" />
              </p>
            ) : (
              paragraphs.map((p, i) => {
                const isLast = i === paragraphs.length - 1;
                const lines = p.split('\n');
                const isList = lines.every((l) => /^[-•]\s+/.test(l));
                const pKey = `${i}:${p.slice(0, 32)}`;
                if (isList) {
                  return (
                    <ul key={pKey} className="space-y-2 pl-6">
                      {lines.map((l, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: streamed bullet — positional key is correct
                        <li key={`${pKey}:bullet:${j}`} className="relative">
                          <span
                            aria-hidden
                            className="absolute -left-5 top-[0.7em] h-px w-3 bg-foreground"
                          />
                          {renderInlineCitations(
                            l.replace(/^[-•]\s+/, ''),
                            citations,
                            onOpenCitation,
                          )}
                          {streaming && isLast && j === lines.length - 1 && (
                            <span className="caret" />
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={pKey}>
                    {renderInlineCitations(p, citations, onOpenCitation)}
                    {streaming && isLast && <span className="caret" />}
                  </p>
                );
              })
            )}
          </article>

          {error && (
            <p
              role="alert"
              className="mt-4 border border-destructive bg-destructive/[0.06] px-3 py-2 text-[12px] font-[500] leading-[1.5] text-destructive"
            >
              {error}
            </p>
          )}

          {citations && citations.length > 0 && (
            <SourcesPanel citations={citations} onOpen={onOpenCitation} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Memoise so settled messages don't re-render every time a new chunk
// arrives for the assistant message being streamed. The parent's
// `messages.map(...)` preserves object identity for unchanged messages,
// so shallow prop comparison is enough — React skips the whole subtree.
export const Message = memo(MessageImpl);
