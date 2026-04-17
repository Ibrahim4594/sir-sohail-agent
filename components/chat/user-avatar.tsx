import { cn } from '@/lib/utils';

/**
 * Shared avatar — renders the OAuth profile image when available, else
 * a monochrome initials tile. Centralises what used to be duplicated
 * across account-menu.tsx, sidebar.tsx, and (now) message.tsx.
 *
 * Callable as a function (not just JSX) so unit tests can inspect the
 * returned React element directly without needing a DOM. Keep it pure —
 * no hooks, no context.
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  className,
}: {
  avatarUrl: string | null;
  displayName: string;
  className?: string;
}) {
  const trimmed = displayName.trim();
  const initials =
    trimmed.length === 0
      ? '?'
      : trimmed.length === 1
        ? trimmed.charAt(0).toUpperCase()
        : trimmed.slice(0, 2).toUpperCase();

  const baseClass = 'shrink-0 rounded-[5px]';

  if (avatarUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: OAuth profile URLs vary in size; next/image can't predict
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(baseClass, 'object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        baseClass,
        'grid place-items-center bg-foreground text-[12px] font-[600] leading-none tracking-[0.04em] text-background',
        className,
      )}
    >
      {initials}
    </span>
  );
}
