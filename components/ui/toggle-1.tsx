'use client';
import type React from 'react';
import { cn } from '@/lib/utils';

/**
 * Monochrome toggle switch — iOS-style track + thumb.
 *
 * This is a tightened port of the 21st.dev shugar/toggle-1 component.
 * The original shipped with 8 colour variants and a large Vercel-Geist
 * design-token block; this project is strict monochrome, so the colour
 * system has been dropped and all surfaces now read from the existing
 * theme tokens (foreground / background / muted / border).
 *
 * Also fixed: the upstream had a stray `"` inside a template literal
 * (`bg-gray-100" ${...}`) which produced an invalid class name on
 * certain paths. The rewrite uses a single token per state.
 */
interface ToggleProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  size?: 'small' | 'large';
  icon?: {
    checked: React.ReactNode;
    unchecked: React.ReactNode;
  };
  direction?: 'switch-first' | 'label-first';
  children?: React.ReactNode;
}

function computeClasses({
  checked,
  disabled,
  size,
}: {
  checked: boolean;
  disabled: boolean;
  size: 'small' | 'large';
}) {
  const track = cn(
    'relative inline-block rounded-full border transition-colors duration-150',
    size === 'small' ? 'h-[14px] w-7' : 'h-6 w-10',
    disabled && 'cursor-not-allowed opacity-50',
    !disabled && 'cursor-pointer',
    checked
      ? 'border-foreground/80 bg-foreground'
      : 'border-foreground/20 bg-muted',
  );

  const thumb = cn(
    'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-background',
    'shadow-[0_0_4px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.16)] transition-[left,background-color] duration-150',
    size === 'small' ? 'h-3 w-3' : 'h-[22px] w-[22px]',
    checked
      ? size === 'small'
        ? 'left-[14px]'
        : 'left-4'
      : 'left-0',
    disabled && 'bg-muted',
  );

  return { track, thumb };
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'small',
  icon,
  direction = 'label-first',
  children,
  className,
  ...rest
}: ToggleProps) {
  const { track, thumb } = computeClasses({ checked, disabled, size });
  return (
    <label
      {...rest}
      className={cn(
        'relative inline-flex select-none items-center gap-2 py-[3px] text-xs text-muted-foreground',
        direction === 'switch-first' && 'flex-row-reverse',
        disabled && 'cursor-not-allowed',
        className,
      )}
    >
      {children && <span>{children}</span>}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="absolute h-0 w-0 appearance-none"
      />
      <span className={track}>
        <span className={thumb} aria-hidden>
          {icon && (checked ? icon.checked : icon.unchecked)}
        </span>
      </span>
    </label>
  );
}
