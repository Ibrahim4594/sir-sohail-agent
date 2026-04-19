'use client';
import { ArrowUpRight, Check, Copy, RotateCcw, Square, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Children, memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BrandMark } from '@/components/brand/mark';
import { markdownToPlain } from '@/lib/md-to-plain';
import { isSpeechSupported, useSpeak } from '@/lib/use-speak';
import { cn } from '@/lib/utils';
import { renderInlineCitations } from './citation-ref';
import { SourcesPanel } from './sources-panel';
import type { Citation, UIMessage } from './types';
import { UserAvatar } from './user-avatar';

function MessageImpl({
  message,
  onOpenCitation,
  avatarUrl,
  displayName,
  isLastAssistant,
  onRegenerate,
  onAskFollowup,
}: {
  message: UIMessage;
  onOpenCitation: (citation: Citation) => void;
  isFirst: boolean;
  avatarUrl?: string | null;
  displayName?: string;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onAskFollowup?: (text: string) => void;
}) {
  const { role, content, streaming, citations, error, followups } = message;

  // Wrap string children from react-markdown so inline [N] citation
  // markers stay interactive after markdown formatting kicks in.
  // Applied inside paragraph/list/heading renderers below.
  const wrapCitations = useCallback(
    (nodes: ReactNode): ReactNode => {
      if (!citations || citations.length === 0) return nodes;
      return Children.map(nodes, (child) => {
        if (typeof child === 'string') {
          return renderInlineCitations(child, citations, onOpenCitation);
        }
        return child;
      });
    },
    [citations, onOpenCitation],
  );

  // content-visibility: auto lets off-screen assistant messages skip
  // paint entirely, which scales well for long conversations. Disabled
  // for the currently-streaming message (content-visibility can flash
  // on incremental updates) and for user messages (cheap anyway).
  const contentVisibilityStyle =
    role === 'assistant' && !streaming
      ? { contentVisibility: 'auto' as const, containIntrinsicSize: '0 600px' }
      : undefined;

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

  const hasBody = content.trim() !== '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-8"
      style={contentVisibilityStyle}
    >
      <div className="flex gap-4">
        <div className="shrink-0 pt-1" role="img" aria-label="Ibid">
          <BrandMark className="h-6 w-6 text-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <article
            aria-live={streaming ? 'polite' : undefined}
            aria-atomic="false"
            className="prose-ibid space-y-4 text-[16px] leading-[1.72] text-foreground"
          >
            {!hasBody ? (
              <p className="text-muted-foreground">
                <span className="caret" />
              </p>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p>{wrapCitations(children)}</p>,
                  ul: ({ children }) => <ul className="space-y-2 pl-5">{children}</ul>,
                  ol: ({ children }) => (
                    <ol className="list-decimal space-y-2 pl-6 marker:text-muted-foreground">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="relative">{wrapCitations(children)}</li>,
                  strong: ({ children }) => (
                    <strong className="font-[600]">{wrapCitations(children)}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{wrapCitations(children)}</em>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-1 underline-offset-[3px] hover:decoration-2"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l border-foreground/40 pl-4 text-foreground/85 italic">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h3 className="mt-2 font-display text-[22px] font-[600] leading-[1.2] tracking-[-0.015em]">
                      {wrapCitations(children)}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="mt-2 font-display text-[20px] font-[600] leading-[1.2] tracking-[-0.015em]">
                      {wrapCitations(children)}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="mt-1 font-display text-[18px] font-[600] leading-[1.25]">
                      {wrapCitations(children)}
                    </h4>
                  ),
                  hr: () => <hr className="border-t border-rule" />,
                  code: ({ className, children, ...props }) => {
                    const isFenced = typeof className === 'string' && /language-/.test(className);
                    if (isFenced) {
                      // Fenced block — wrapped by <pre> below, keep
                      // monospace + language class for future highlighter.
                      return (
                        <code className={cn('font-mono text-[13px]', className)} {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="rounded bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.86em]">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="overflow-x-auto border border-rule bg-muted/60 p-4 leading-[1.55]">
                      {children}
                    </pre>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            )}
            {streaming && hasBody && <span className="caret" aria-hidden />}
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

          {/* Action row — copy + read-aloud + (regenerate on the most
              recent turn). Visible as soon as the message has stopped
              streaming, so the user can act the instant the answer
              settles. */}
          {!streaming && hasBody && (
            <div className="mt-3 flex items-center gap-1">
              <CopyButton text={content} />
              <SpeakButton messageId={message.id} markdown={content} />
              {isLastAssistant && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                  className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-rule hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Regenerate
                </button>
              )}
            </div>
          )}

          {/* Follow-up suggestions — only on the most recent assistant
              turn, only after streaming settles, and only when the
              server actually returned suggestions (refusals + greetings
              come back with an empty list). Clicking a suggestion is
              the same as the user typing it. */}
          {!streaming &&
            hasBody &&
            isLastAssistant &&
            onAskFollowup &&
            followups &&
            followups.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Follow up
                </p>
                <div className="flex flex-col gap-1.5">
                  {followups.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskFollowup(q)}
                      className="group flex w-full items-center justify-between gap-3 rounded-md border border-rule bg-background px-3 py-2.5 text-left text-[14px] leading-[1.4] text-foreground transition hover:border-foreground hover:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">{q}</span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}

function SpeakButton({ messageId, markdown }: { messageId: string; markdown: string }) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);
  const { isActive, toggle } = useSpeak(messageId);
  const plain = useMemo(() => markdownToPlain(markdown), [markdown]);

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => toggle(plain)}
      aria-label={isActive ? 'Stop playback' : 'Read aloud'}
      className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-rule hover:text-foreground"
    >
      {isActive ? (
        <>
          <Square className="h-3 w-3" aria-hidden />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-3 w-3" aria-hidden />
          Read aloud
        </>
      )}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied — silently ignore */
    }
  }, [text]);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? 'Copied' : 'Copy message'}
      className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-rule hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// Memo — settled messages don't re-render when a new chunk arrives for
// the message currently streaming. Parent preserves object identity on
// unchanged messages, so shallow prop comparison works.
export const Message = memo(MessageImpl);
