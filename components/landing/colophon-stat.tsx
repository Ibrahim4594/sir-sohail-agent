import { NumberTicker } from '@/components/ui/number-ticker';

/**
 * A small editorial number block — used in the right rail of the landing.
 * Renders a ticker that counts up from zero to the given value on first paint.
 */
export function ColophonStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <NumberTicker
          value={value}
          className="font-display text-7xl italic leading-none tracking-tight text-foreground"
        />
        <span
          aria-hidden
          className="font-display text-3xl italic leading-none text-[var(--oxblood)]"
        >
          /
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          live
        </span>
      </div>
      <p className="label max-w-[20ch]">{label}</p>
    </div>
  );
}
