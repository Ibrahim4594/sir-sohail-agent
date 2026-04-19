'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/brand/mark';
import { UserAvatar } from '@/components/chat/user-avatar';

const QUESTION =
  'Does problem-based learning improve entrepreneurship outcomes for undergraduates?';

type Token = { text: string } | { cite: number };

const ANSWER: Token[] = [
  { text: 'Students' },
  { text: ' enrolled' },
  { text: ' in' },
  { text: ' problem-based' },
  { text: ' entrepreneurship' },
  { text: ' courses' },
  { text: ' showed' },
  { text: ' measurable' },
  { text: ' gains' },
  { text: ' in' },
  { text: ' opportunity' },
  { text: ' recognition' },
  { text: ' and' },
  { text: ' self-efficacy' },
  { text: ' compared' },
  { text: ' to' },
  { text: ' lecture-based' },
  { text: ' cohorts' },
  { cite: 1 },
  { text: '.' },
  { text: ' Gains' },
  { text: ' were' },
  { text: ' strongest' },
  { text: ' when' },
  { text: ' coursework' },
  { text: ' culminated' },
  { text: ' in' },
  { text: ' a' },
  { text: ' real-world' },
  { text: ' pitch' },
  { text: ' to' },
  { text: ' external' },
  { text: ' stakeholders' },
  { cite: 2 },
  { text: '.' },
];

// Timeline constants. Tuned so the whole sequence settles in ~4.5s once
// the hero's rise animation has already played. Slow enough to register
// as "the product is working," fast enough that nobody stares at it.
const START_DELAY = 900;
const TYPE_MS = 26;
const TYPE_JITTER = 0.35; // ±35% per character — kills the mechanical feel
const PUNCT_PAUSE_MS = 120; // extra dwell after comma/period for human rhythm
const THINK_MS = 500;
const STREAM_MS = 55;
const SETTLE_MS = 320;

function nextTypeDelay(previousChar: string | undefined): number {
  const jitter = 1 + (Math.random() - 0.5) * TYPE_JITTER * 2;
  const base = TYPE_MS * jitter;
  if (previousChar === ',' || previousChar === '.' || previousChar === '?') {
    return base + PUNCT_PAUSE_MS;
  }
  return base;
}

type Phase = 'pre' | 'typing' | 'thinking' | 'streaming' | 'settling' | 'done';

export function LiveTrace() {
  const [phase, setPhase] = useState<Phase>('pre');
  const [typedLen, setTypedLen] = useState(0);
  const [streamIdx, setStreamIdx] = useState(0);

  // Kickoff + reduced-motion short-circuit. If the user has asked the OS
  // to reduce motion we skip the whole choreography and render the
  // final state — they still see the worked example, just not the play.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedLen(QUESTION.length);
      setStreamIdx(ANSWER.length);
      setPhase('done');
      return;
    }
    const t = window.setTimeout(() => setPhase('typing'), START_DELAY);
    return () => window.clearTimeout(t);
  }, []);

  // Each phase has its own effect. One timeout at a time keeps the
  // scheduler uncluttered and lets React batch state updates cleanly.
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typedLen >= QUESTION.length) {
      setPhase('thinking');
      return;
    }
    const delay = nextTypeDelay(QUESTION[typedLen - 1]);
    const t = window.setTimeout(() => setTypedLen((n) => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [phase, typedLen]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    const t = window.setTimeout(() => setPhase('streaming'), THINK_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'streaming') return;
    if (streamIdx >= ANSWER.length) {
      setPhase('settling');
      return;
    }
    const t = window.setTimeout(() => setStreamIdx((n) => n + 1), STREAM_MS);
    return () => window.clearTimeout(t);
  }, [phase, streamIdx]);

  useEffect(() => {
    if (phase !== 'settling') return;
    const t = window.setTimeout(() => setPhase('done'), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const questionText = QUESTION.slice(0, typedLen);
  const visibleTokens = ANSWER.slice(0, streamIdx);
  const showQuestionCaret = phase === 'typing';
  const showAnswerCaret = phase === 'streaming';
  const showThinking = phase === 'thinking';
  const showSources = phase === 'done';
  const answerHasStarted = phase === 'streaming' || phase === 'settling' || phase === 'done';

  return (
    <div className="flex flex-col gap-7 border-l border-rule pl-8 lg:pl-10">
      <p className="label inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-[5px] w-[5px] rounded-full bg-foreground"
          style={{ animation: 'var(--animate-live-pulse)' }}
        />
        A live trace
      </p>

      {/* Question row — mirrors the chat surface exactly: left avatar,
          right text column in display face. */}
      <div className="flex gap-3">
        <div className="shrink-0 pt-[3px]" role="img" aria-label="You">
          <UserAvatar avatarUrl={null} displayName="?" className="h-5 w-5" />
        </div>
        <p className="min-h-[1.4em] flex-1 font-display text-[19px] font-[400] leading-[1.35] tracking-[-0.015em] text-foreground">
          {questionText}
          {showQuestionCaret && <span className="caret" />}
        </p>
      </div>

      {/* Assistant row — Sir Sohail Agent mark + streaming body. The wrapper has a
          min-height so the layout doesn't jump when the answer appears. */}
      <div className="flex gap-3">
        <div className="shrink-0 pt-[3px]" role="img" aria-label="Sir Sohail Agent">
          <BrandMark className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-h-[3.5em] min-w-0 flex-1 text-[15px] leading-[1.65] text-foreground/85">
          {showThinking && <ThinkingDots />}
          {answerHasStarted && (
            <p>
              {visibleTokens.map((t, i) =>
                'cite' in t ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: token order is fixed at module scope, positional key is correct
                  <CiteMark key={`cite-${i}`} n={t.cite} />
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: same reason — ANSWER is a frozen constant
                  <span key={`word-${i}`}>{t.text}</span>
                ),
              )}
              {showAnswerCaret && <span className="caret" />}
            </p>
          )}
        </div>
      </div>

      {/* Sources — held back until the answer settles, then rises into
          view. Reserves its own block space from the start so the
          reveal doesn't push the footer. */}
      <dl
        aria-hidden={!showSources}
        className="min-h-[76px] space-y-3 border-t border-rule pt-5 font-mono text-[11px] tracking-[0.04em]"
      >
        {showSources && (
          <>
            <SourceRow
              n={1}
              author="Bell, Bell & Bell"
              title="Entrepreneurship education as a field of research"
              loc="p. 12"
              delay={0}
            />
            <SourceRow
              n={2}
              author="Rae & Melton"
              title="Developing an entrepreneurial mindset through project-based learning"
              loc="p. 31"
              delay={90}
            />
          </>
        )}
      </dl>
    </div>
  );
}

function CiteMark({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="ml-[1px] inline-flex items-baseline align-super font-mono text-[0.58em] leading-none text-foreground"
      style={{
        borderBottom: '1px solid currentColor',
        padding: '1px 3px',
        marginRight: '1px',
        animation: 'var(--animate-cite-pop)',
      }}
    >
      {n}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[4px] pt-[0.4em] align-baseline" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[5px] w-[5px] rounded-full bg-muted-foreground"
          style={{
            animation: 'var(--animate-think-dot)',
            animationDelay: `${i * 180}ms`,
          }}
        />
      ))}
    </span>
  );
}

function SourceRow({
  n,
  author,
  title,
  loc,
  delay,
}: {
  n: number;
  author: string;
  title: string;
  loc: string;
  delay: number;
}) {
  // Author name carries a drawn-in underline that starts right after the
  // row has settled — this is the "linkback" moment that dramatises how
  // each inline citation resolves to an exact source. Left-origin so it
  // reads as being drawn with a pen, not fading in.
  const underlineDelay = delay + 420;
  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 text-muted-foreground"
      style={{
        animation: 'var(--animate-source-rise)',
        animationDelay: `${delay}ms`,
      }}
    >
      <dt className="tabular text-foreground">[{n}]</dt>
      <dd className="truncate">
        <span className="relative text-foreground">
          {author}.
          <span
            aria-hidden
            className="absolute right-0 bottom-[-1px] left-0 block h-px origin-left bg-foreground"
            style={{
              animation: 'var(--animate-source-underline)',
              animationDelay: `${underlineDelay}ms`,
            }}
          />
        </span>{' '}
        <span className="italic">{title}</span>
      </dd>
      <dd className="tabular text-foreground/70">{loc}</dd>
    </div>
  );
}
