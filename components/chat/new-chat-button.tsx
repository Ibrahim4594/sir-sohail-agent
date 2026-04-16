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
        'group relative flex items-center justify-between gap-3 rounded-md border border-foreground/15 bg-card px-3.5 py-2.5 text-sm transition',
        'hover:border-[var(--oxblood)] hover:bg-[var(--oxblood)]/[0.05]',
        active && 'border-[var(--oxblood)] bg-[var(--oxblood)]/[0.05]',
      )}
    >
      <span className="font-display italic tracking-tight">A new conversation</span>
      <span
        aria-hidden
        className={cn(
          'font-mono text-xs text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--oxblood)]',
          active && 'text-[var(--oxblood)]',
        )}
      >
        ⟶
      </span>
    </Link>
  );
}
