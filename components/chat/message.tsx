'use client';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { renderInlineCitations } from './citation-ref';
import { SourcesPanel } from './sources-panel';
import type { Citation, UIMessage } from './types';

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function Message({
  message,
  onOpenCitation,
}: {
  message: UIMessage;
  onOpenCitation: (citation: Citation) => void;
  isFirst: boolean;
}) {
  const { role, content, streaming, citations, error } = message;

  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
      >
        <div className="mb-3 flex items-baseline gap-4">
          <span className="label">You asked</span>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>
        <p className="whitespace-pre-wrap font-display text-[22px] leading-[1.35] font-[400] tracking-[-0.015em] text-foreground">
          {content}
        </p>
      </motion.div>
    );
  }

  const paragraphs = splitParagraphs(content || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
    >
      <div className="mb-4 flex items-baseline gap-4">
        <span className="label label--ink">The assistant</span>
        <span aria-hidden className="h-px flex-1 bg-foreground" />
      </div>

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
                      {renderInlineCitations(l.replace(/^[-•]\s+/, ''), citations, onOpenCitation)}
                      {streaming && isLast && j === lines.length - 1 && <span className="caret" />}
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
        <p className="mt-4 border border-destructive/40 bg-destructive/[0.04] px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {citations && citations.length > 0 && (
        <SourcesPanel citations={citations} onOpen={onOpenCitation} />
      )}
    </motion.div>
  );
}
