'use client';
import { Moon, Sun } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle-1';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/utils';

/**
 * Compact theme toggle for the chat layout's top-right slot. Uses the
 * same Toggle primitive as the /settings page row but drops the text
 * label so it reads as an ambient control, not a menu entry. A thin
 * backdrop-blurred chip keeps it visible against streaming messages
 * scrolling underneath.
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-rule bg-background/70 px-2 py-1 backdrop-blur-sm shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      {isDark ? (
        <Moon className="size-[14px] text-foreground" strokeWidth={1.75} aria-hidden />
      ) : (
        <Sun className="size-[14px] text-foreground" strokeWidth={1.75} aria-hidden />
      )}
      <Toggle
        checked={isDark}
        onChange={toggle}
        size="small"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      />
    </div>
  );
}
