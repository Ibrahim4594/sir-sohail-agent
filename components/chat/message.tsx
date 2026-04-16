'use client';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { renderInlineCitations } from './citation-ref';
import { SourcesPanel } from './sources-panel';
import type { Citation, UIMessage } from './types';

/**
 * Splits the text into paragraphs on blank lines; leaves bulleted lines alone.
 * The Editorial Scholar treatment keeps paragraph breaks but doesn't parse
 * full markdown — the LLM is instructed to answer concisely.
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function Message({
  message,
  onOpenCitation,
  isFirst,
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
        className="group mx-auto w-full max-w-3xl px-6 py-3 sm:px-8"
      >
        <div className="flex items-baseline gap-3">
          <span className="label shrink-0 pt-0.5">You</span>
          <div className="h-px flex-1 translate-y-[5px] bg-foreground/15" />
        </div>
        <p className="mt-2 whitespace-pre-wrap font-display text-[19px] leading-[1.45] tracking-[-0.005em] text-foreground">
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
      className="group mx-auto w-full max-w-3xl px-6 py-4 sm:px-8"
    >
      <div className="flex items-baseline gap-3">
        <span className="label shrink-0 pt-0.5 text-[var(--oxblood)]">The assistant</span>
        <div className="h-px flex-1 translate-y-[5px] bg-[var(--oxblood)]/35" />
      </div>

      <article
        className={cn(
          'mt-3 space-y-4 text-[16px] leading-[1.65] text-foreground/95',
          'font-sans',
          isFirst && !streaming && paragraphs.length > 0 && '[&>p:first-child]:drop-cap',
        )}
      >
        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground italic">
            <span className="caret" />
          </p>
        ) : (
          paragraphs.map((p, i) => {
            const isLast = i === paragraphs.length - 1;
            // Support very simple bullets (lines starting with "- " or "• ").
            const lines = p.split('\n');
            const isList = lines.every((l) => /^[-•]\s+/.test(l));
            // Content + position gives us a key stable enough for streamed text
            // and distinct across duplicates; mutates along with content.
            const pKey = `${i}:${p.slice(0, 32)}`;
            if (isList) {
              return (
                <ul key={pKey} className="space-y-1.5 pl-5">
                  {lines.map((l, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: streamed bullet list — positional key is correct semantics
                    <li key={`${pKey}:bullet:${j}`} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-4 top-[0.55em] h-px w-2 bg-[var(--oxblood)]"
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
        <p className="mt-3 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {citations && citations.length > 0 && (
        <SourcesPanel citations={citations} onOpen={onOpenCitation} />
      )}
    </motion.div>
  );
}
