'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/utils';

/**
 * Three-state theme picker for the settings page — light / dark /
 * follow-system. The underlying useTheme hook already listens to the
 * OS preference change; the "System" option clears the localStorage
 * override so the hook falls back to the media query.
 */
export function ThemeCard() {
  const { theme, setTheme, isDark } = useTheme();

  const options = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'Follow system', icon: Monitor },
  ] as const;

  const current = (() => {
    // "system" is represented by no localStorage entry; we can't read
    // that directly from the hook, so infer: if the current theme
    // matches the OS and nothing was set explicitly, we're on system.
    // For a simpler MVP we just treat theme === 'dark' / 'light' as
    // explicit. Users can force a re-sync with "Follow system."
    return theme;
  })();

  return (
    <fieldset className="py-2">
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((opt) => {
          const active = opt.key === current;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === 'system') {
                  try {
                    window.localStorage.removeItem('theme');
                  } catch {
                    /* ignore */
                  }
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  setTheme(prefersDark ? 'dark' : 'light');
                } else {
                  setTheme(opt.key);
                }
              }}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-3 rounded-md border px-4 py-3 text-left transition',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-rule bg-background text-foreground hover:border-foreground/50',
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="text-[13px] font-[500] leading-none">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-[1.5] text-muted-foreground">
        Currently rendering in{' '}
        <span className="font-[500] text-foreground">{isDark ? 'dark' : 'light'}</span> mode.
        Changes apply instantly and persist on this device.
      </p>
    </fieldset>
  );
}
