'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AccountMenu } from './account-menu';
import type { SidebarConversation } from './sidebar';

type NavItem = {
  href: string;
  label: string;
  glyph: string; // mono-friendly single-character icon
  badge?: string;
};

type Props = {
  email: string;
  displayName: string;
  role: string;
  initials: string;
  conversations: SidebarConversation[];
  buckets: {
    today: SidebarConversation[];
    week: SidebarConversation[];
    older: SidebarConversation[];
  };
};

const SIDEBAR_WIDTH_COLLAPSED = '60px';
const SIDEBAR_WIDTH_EXPANDED = '280px';

const shellTransition = {
  duration: 0.22,
  ease: [0.2, 0.8, 0.2, 1],
} as const;

export function SidebarShell({
  email,
  displayName,
  role,
  initials,
  conversations,
  buckets,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/chat', label: 'New conversation', glyph: '+' },
    { href: '/overview', label: 'Corpus overview', glyph: '¶' },
    ...(role === 'admin'
      ? [{ href: '/admin/documents', label: 'Admin — Documents', glyph: '†', badge: 'Admin' }]
      : []),
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
      transition={shellTransition}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      className="relative flex h-full shrink-0 flex-col border-r border-rule bg-sidebar overflow-hidden"
      aria-label="Sidebar navigation"
    >
      {/* Masthead — always shows the monogram; the wordmark slides in when expanded. */}
      <div className="flex h-[72px] items-center gap-3 px-[14px] border-b border-rule">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-foreground font-mono text-[11px] font-semibold leading-none tracking-[0.04em] text-background"
          >
            S
          </span>
          <AnimatedLabel open={open} delay={0.04}>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-baseline gap-1 whitespace-nowrap font-display text-[15px] font-[500] leading-[1.1] tracking-[-0.015em] text-foreground">
                Sir Sohail<span className="italic font-[400]">&rsquo;s</span>
              </span>
              <span className="label mt-1 whitespace-nowrap">Research Assistant</span>
            </span>
          </AnimatedLabel>
        </Link>
      </div>

      {/* Primary nav — icon rail always, labels on expand */}
      <nav className="border-b border-rule px-2 py-3" aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active =
              item.href === '/chat'
                ? pathname === '/chat'
                : (pathname?.startsWith(item.href) ?? false);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex h-10 items-center gap-3 rounded-[4px] px-[9px] text-[13px] transition-colors duration-150',
                    active ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center font-mono text-[13px] leading-none"
                  >
                    {item.glyph}
                  </span>
                  <AnimatedLabel open={open} delay={0.06} className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 whitespace-nowrap">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </AnimatedLabel>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Conversation history — only visible when expanded */}
      <div className="flex-1 overflow-hidden">
        <AnimatedLabel open={open} delay={0.08} className="flex h-full flex-col">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
            <span className="label label--ink">Recent</span>
            <span className="font-mono text-[9px] tabular-nums uppercase tracking-[0.22em] text-muted-foreground">
              {conversations.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {conversations.length === 0 ? (
              <div className="px-2 pt-4">
                <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
                  No conversations yet. Start a new one above.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <ConversationBucket
                  label="Today"
                  items={buckets.today}
                  activeId={activeConvId(pathname)}
                />
                <ConversationBucket
                  label="Last 7 days"
                  items={buckets.week}
                  activeId={activeConvId(pathname)}
                />
                <ConversationBucket
                  label="Older"
                  items={buckets.older}
                  activeId={activeConvId(pathname)}
                />
              </div>
            )}
          </div>
        </AnimatedLabel>
      </div>

      {/* Account — always visible (avatar in collapsed, full card on expand) */}
      <div className="border-t border-rule p-2">
        {open ? (
          <div className="px-1">
            <AccountMenu email={email} displayName={displayName} initials={initials} role={role} />
          </div>
        ) : (
          <div aria-hidden className="grid h-10 place-items-center" title={displayName || email}>
            <span className="grid h-8 w-8 place-items-center rounded-[4px] bg-foreground font-mono text-[11px] font-semibold leading-none tracking-[0.04em] text-background">
              {initials}
            </span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function activeConvId(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/chat\/([0-9a-f-]{8,})/i);
  return match?.[1] ?? null;
}

function ConversationBucket({
  label,
  items,
  activeId,
}: {
  label: string;
  items: SidebarConversation[];
  activeId: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="label px-2 pb-1.5">{label}</p>
      <ul>
        {items.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className={cn(
                  'group relative flex items-baseline justify-between gap-3 rounded-[3px] px-2 py-1.5 text-[13px] transition-colors duration-150',
                  'hover:bg-muted',
                  active && 'bg-muted',
                )}
              >
                {active && (
                  <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] bg-foreground" />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate leading-[1.3]',
                    active ? 'font-[500] text-foreground' : 'text-foreground/90',
                  )}
                  title={c.title ?? 'Untitled'}
                >
                  {c.title ?? 'Untitled'}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[10px] tabular-nums tracking-[0.04em] transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground/80',
                  )}
                >
                  {formatRelative(c.updated_at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  return `${w}w`;
}

/**
 * Slides + fades a label in when the sidebar opens. Uses display:none
 * at rest so truncation + layout don't compute against a hidden block.
 */
function AnimatedLabel({
  open,
  children,
  className,
  delay = 0,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: open ? 1 : 0, x: open ? 0 : -4 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1], delay: open ? delay : 0 }}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      className={cn('min-w-0', className)}
      aria-hidden={!open}
    >
      {children}
    </motion.div>
  );
}
