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
        'group flex w-full items-center justify-between gap-3 border border-foreground bg-foreground px-3.5 py-2.5 text-[13px] font-medium text-background transition',
        'hover:bg-background hover:text-foreground',
        active && 'bg-background text-foreground',
      )}
    >
      <span>A new conversation</span>
      <span
        aria-hidden
        className="font-mono text-[13px] leading-none transition group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
