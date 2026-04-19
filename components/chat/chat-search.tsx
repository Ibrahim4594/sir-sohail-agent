'use client';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SidebarConversation } from './sidebar';

const MAX_RESULTS = 40;

/**
 * Cmd/Ctrl-K search palette. Filters the already-loaded conversation
 * list by case-insensitive substring on title. Arrow keys move a cursor,
 * Enter jumps to the selection, Esc closes. For now we search only
 * against titles — the sidebar's 80-item cap keeps everything in memory,
 * and once Sir Sohail crosses 80 chats we'll swap in a server route.
 *
 * Rendered inline as a fixed-position overlay when open; hidden
 * otherwise. The trigger row is a regular sidebar button shown above
 * the chat history — it also behaves as the accessible entry point
 * for users who don't discover the keyboard shortcut.
 */
export function ChatSearch({ conversations }: { conversations: SidebarConversation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMac(navigator.userAgent.toUpperCase().includes('MAC'));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Global ⌘K / Ctrl-K toggle. Attached once on mount.
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, []);

  // When the dialog opens, reset and focus. Arrow + Enter + Esc bindings
  // live here so they only fire while the dialog is actually open.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    queueMicrotask(() => inputRef.current?.focus());
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [open, close]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations.slice(0, MAX_RESULTS);
    return conversations
      .filter((c) => (c.title ?? 'Untitled').toLowerCase().includes(q))
      .slice(0, MAX_RESULTS);
  }, [query, conversations]);

  const navigate = useCallback(
    (id: string) => {
      close();
      router.push(`/chat/${id}`);
    },
    [close, router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search chats"
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-[400] leading-none text-foreground transition hover:bg-muted"
      >
        <SearchIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">Search chats</span>
        <kbd className="font-mono text-[10px] text-muted-foreground">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      {open && (
        <SearchDialog
          query={query}
          cursor={cursor}
          results={results}
          inputRef={inputRef}
          onQuery={(q) => {
            setQuery(q);
            setCursor(0);
          }}
          onMove={(delta) =>
            setCursor((i) => {
              const next = i + delta;
              if (next < 0) return 0;
              if (next > results.length - 1) return Math.max(0, results.length - 1);
              return next;
            })
          }
          onPick={navigate}
          onClose={close}
          onHover={setCursor}
        />
      )}
    </>
  );
}

type SearchDialogProps = {
  query: string;
  cursor: number;
  results: SidebarConversation[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onMove: (delta: number) => void;
  onPick: (id: string) => void;
  onClose: () => void;
  onHover: (i: number) => void;
};

function SearchDialog({
  query,
  cursor,
  results,
  inputRef,
  onQuery,
  onMove,
  onPick,
  onClose,
  onHover,
}: SearchDialogProps) {
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onMove(-1);
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault();
      onPick(results[cursor].id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search chats"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-[12vh] backdrop-blur-sm"
    >
      {/* Backdrop click-to-close. A transparent button covering the
          backdrop gives us the right semantics without needing keyboard
          handlers on a div — Esc is already wired at the document
          level by the parent. */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-lg border border-rule bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-rule px-4">
          <SearchIcon
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search conversations"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] leading-none text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search conversations"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="shrink-0 font-mono text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1">
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              {query.trim() ? `No chats match "${query.trim()}".` : 'No chats yet.'}
            </li>
          ) : (
            results.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/chat/${c.id}`}
                  onClick={onClose}
                  onMouseEnter={() => onHover(i)}
                  className={cn(
                    'flex h-9 items-center rounded-md px-3 text-[13px] leading-[1.3] transition',
                    i === cursor ? 'bg-muted text-foreground' : 'text-foreground/90 hover:bg-muted',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{c.title ?? 'Untitled'}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
