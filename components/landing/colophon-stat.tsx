import { NumberTicker } from '@/components/ui/number-ticker';

/**
 * A big display number — the only "statistic" on the landing page.
 * Pure type; no box, no icon.
 */
export function ColophonStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="label mb-4">The corpus</p>
      <div className="flex items-baseline gap-3">
        <NumberTicker
          value={value}
          className="font-display text-[104px] leading-[0.82] font-[300] tracking-[-0.04em] text-foreground tabular"
        />
      </div>
      <p className="mt-3 max-w-[22ch] text-sm leading-[1.45] text-muted-foreground">{label}</p>
    </div>
  );
}
