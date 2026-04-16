'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NewChatButton() {
  const pathname = usePathname();
  const active = pathname === '/chat';
  return (
    <Link
      href="/chat"
      className={cn(
        'group flex w-full items-center justify-between gap-3 border border-foreground bg-foreground px-3.5 py-2.5 text-[13px] font-[500] tracking-[-0.005em] text-background transition-all duration-200',
        'hover:bg-background hover:text-foreground',
        active && 'bg-background text-foreground',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-3.5 w-3.5 place-items-center font-mono text-[11px] leading-none"
        >
          +
        </span>
        <span>A new conversation</span>
      </span>
      <span
        aria-hidden
        className="font-mono text-[12px] leading-none transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
