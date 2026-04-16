'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function Composer({
  onSend,
  disabled,
  placeholder = 'Ask the corpus a question\u2026',
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resize when value changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 220);
    el.style.height = `${next}px`;
  }, [value]);

  const submit = () => {
    const v = value.trim();
    if (!v || disabled) return;
    setValue('');
    onSend(v);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        'group mx-auto w-full max-w-3xl rounded-xl border border-foreground/15 bg-card/95 shadow-[0_8px_32px_-16px_rgba(26,31,44,0.25)] backdrop-blur-md transition',
        'focus-within:border-[var(--oxblood)]/60 focus-within:shadow-[0_8px_32px_-12px_rgba(139,38,53,0.22)]',
        disabled && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <span
          aria-hidden
          className="mt-1 font-display text-lg italic leading-none text-[var(--oxblood)]"
        >
          ¶
        </span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            'flex-1 resize-none bg-transparent pb-2 font-sans text-[15px] leading-[1.5] text-foreground',
            'placeholder:text-muted-foreground/80 focus:outline-none',
          )}
          style={{ minHeight: '22px', maxHeight: '220px' }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <p className="label">Enter to send · Shift&nbsp;+&nbsp;Enter for newline</p>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={cn(
            'group/send inline-flex items-center gap-2 rounded-md border border-[var(--oxblood)]/40 bg-[var(--oxblood)] px-3.5 py-1.5 text-[var(--parchment)] transition',
            'hover:bg-[var(--oxblood)]/90 hover:shadow-[0_4px_16px_-6px_rgba(139,38,53,0.5)]',
            'disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-foreground/15',
          )}
        >
          <span className="font-display text-sm italic leading-none">Send</span>
          <span aria-hidden className="font-mono text-[13px] leading-none">
            ⟶
          </span>
        </button>
      </div>
    </form>
  );
}
