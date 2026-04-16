'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What is project-based learning according to the corpus?',
  'Which papers discuss innovation in higher education?',
  'Summarize findings on entrepreneurship education for medical students.',
  'How is design thinking applied across the corpus?',
  'What does the literature say about resilience in innovation education?',
];

function partOfDay(hour: number): string {
  if (hour < 5) return 'evening';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function firstName(displayName: string | undefined): string | null {
  if (!displayName) return null;
  const trimmed = displayName.trim();
  if (!trimmed) return null;
  // Stop at the first space; guard against email addresses.
  const candidate = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed.split(/\s+/)[0];
  if (!candidate) return null;
  // Capitalise only if it looks like a real word.
  return /^[A-Za-z]/.test(candidate)
    ? candidate.charAt(0).toUpperCase() + candidate.slice(1)
    : candidate;
}

export function EmptyState({
  onPick,
  displayName,
}: {
  onPick: (text: string) => void;
  displayName?: string;
}) {
  // Compute greeting on the client so it respects the user's local time,
  // not the server's. Falls back silently to "Ask the corpus." if there's
  // no display name we can surface.
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const period = partOfDay(hour);
    const name = firstName(displayName);
    if (name) {
      setGreeting(`Good ${period}, ${name}.`);
    } else {
      setGreeting(`Good ${period}.`);
    }
  }, [displayName]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-24 sm:px-8">
      <div className="min-h-[120px]">
        {greeting && (
          <p className="label mb-4" style={{ animation: 'fade 600ms both' }}>
            {greeting}
          </p>
        )}
        <h2
          className="font-display text-[48px] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[64px]"
          style={{ animation: 'rise 700ms 80ms both' }}
        >
          Ask the corpus.
        </h2>
      </div>

      <p
        className="mt-5 max-w-xl text-[16px] leading-[1.6] text-muted-foreground"
        style={{ animation: 'rise 700ms 200ms both' }}
      >
        The assistant reads from a closed library of academic papers. It will quote, summarize, or
        decline — never invent.
      </p>

      <div className="mt-14" style={{ animation: 'rise 700ms 320ms both' }}>
        <p className="label mb-4">A few ways to start</p>
        <ul className="divide-y divide-rule border-y border-rule">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className={cn(
                  'group flex w-full items-baseline justify-between gap-6 px-1 py-4 text-left transition',
                  'hover:bg-muted',
                )}
              >
                <span className="text-[17px] leading-[1.4] tracking-[-0.008em] text-foreground">
                  {s}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-sm text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
                >
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
