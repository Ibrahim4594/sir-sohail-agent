'use client';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What is project-based learning according to the corpus?',
  'Which papers discuss innovation in higher education?',
  'Summarize findings on entrepreneurship education for medical students.',
  'How is design thinking applied across the corpus?',
  'What does the literature say about resilience in innovation education?',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-8">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-10 bg-foreground/40" />
        <span className="label">Begin a conversation</span>
      </div>

      <h2 className="mt-6 font-display text-[64px] leading-[0.92] italic tracking-[-0.02em] text-foreground sm:text-[84px]">
        Ask the
        <br />
        corpus<span className="text-[var(--oxblood)]">.</span>
      </h2>

      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        The assistant reads from a closed library of academic papers. It will quote, summarize, or
        decline — never invent. Every claim is footnoted with the exact source page.
      </p>

      <div className="mt-10">
        <p className="label mb-3">A few ways to start</p>
        <ul className="space-y-2">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className={cn(
                  'group flex w-full items-center justify-between gap-6 rounded-md border border-foreground/10 bg-card/70 px-4 py-3 text-left transition',
                  'hover:border-[var(--oxblood)]/50 hover:bg-[var(--oxblood)]/[0.04]',
                )}
              >
                <span className="font-display text-[17px] italic leading-snug tracking-[-0.005em] text-foreground/95">
                  {s}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-xs text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--oxblood)]"
                >
                  ⟶
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
