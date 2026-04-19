'use client';
import { Moon, Sun } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle-1';
import { useTheme } from '@/lib/use-theme';

/**
 * Dark-mode switch — binds the monochrome Toggle to the useTheme hook
 * and renders the Sun/Moon icon + label as the toggle's `children`, so
 * the whole row is one `<label>` element with the input inside it. This
 * keeps the HTML semantically correct (one label → one input) and lets
 * the user click anywhere in the row to flip themes.
 */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Toggle
      checked={isDark}
      onChange={toggle}
      size="small"
      aria-label="Toggle dark mode"
      className="flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-[13px] text-foreground hover:bg-muted"
    >
      <span className="flex items-center gap-2 leading-none">
        {isDark ? (
          <Moon className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Sun className="size-4" strokeWidth={1.75} aria-hidden />
        )}
        {isDark ? 'Dark mode' : 'Light mode'}
      </span>
    </Toggle>
  );
}
