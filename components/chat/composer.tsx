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
        'group mx-auto w-full max-w-3xl border border-foreground bg-background transition',
        'focus-within:border-foreground',
        disabled && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3 px-5 pt-4">
        <span aria-hidden className="label pt-1.5 shrink-0">
          Ask
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
            'flex-1 resize-none bg-transparent pb-2 font-display text-[19px] leading-[1.4] tracking-[-0.005em] text-foreground',
            'placeholder:text-muted-foreground focus:outline-none',
          )}
          style={{ minHeight: '22px', maxHeight: '220px' }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-2.5">
        <p className="label">Enter to send · Shift + Enter for newline</p>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={cn(
            'group/send inline-flex items-center gap-2.5 border border-foreground bg-foreground px-4 py-1.5 text-[12px] font-medium tracking-[0.04em] text-background transition',
            'hover:bg-background hover:text-foreground',
            'disabled:pointer-events-none disabled:border-rule disabled:bg-background disabled:text-muted-foreground',
          )}
        >
          <span className="font-mono uppercase tracking-[0.22em]">Send</span>
          <span aria-hidden className="font-mono leading-none">
            →
          </span>
        </button>
      </div>
    </form>
  );
}
