'use client';
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { SidebarConversation } from './sidebar';

export function ConversationRow({
  conversation,
  active,
}: {
  conversation: SidebarConversation;
  active: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversation.title ?? 'Untitled');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  // A 404 from any of these handlers means the server already doesn't
  // have this row — probably because another tab deleted it or the
  // sidebar hasn't caught up yet. Either way the right move is to
  // refresh the list so the ghost row disappears, rather than stand
  // firm with a scary "could not" toast.
  const handleStaleRow = () => {
    toast.info('That conversation is already gone — refreshing list.');
    if (params?.conversationId === conversation.id) {
      router.replace('/chat');
    } else {
      router.refresh();
    }
  };

  const commitRename = async () => {
    const title = draft.trim();
    setRenaming(false);
    if (!title || title === conversation.title) return;
    setBusy(true);
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setBusy(false);
    if (res.status === 404) {
      handleStaleRow();
      return;
    }
    if (!res.ok) {
      toast.error('Could not rename conversation.');
      setDraft(conversation.title ?? 'Untitled');
      return;
    }
    router.refresh();
  };

  const togglePin = async () => {
    const nextPinned = !conversation.pinned_at;
    setBusy(true);
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: nextPinned }),
    });
    setBusy(false);
    if (res.status === 404) {
      handleStaleRow();
      return;
    }
    if (!res.ok) {
      toast.error('Could not update pin state.');
      return;
    }
    toast.success(nextPinned ? 'Pinned' : 'Unpinned');
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!window.confirm(`Delete "${conversation.title ?? 'Untitled'}"? This can't be undone.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/conversations/${conversation.id}`, { method: 'DELETE' });
    if (res.status === 404) {
      // Same outcome the user wanted — row is gone from the DB.
      // Cleanly return to /chat if we were viewing that convo.
      handleStaleRow();
      return;
    }
    if (!res.ok) {
      toast.error('Could not delete conversation.');
      setBusy(false);
      return;
    }
    toast.success('Conversation deleted.');
    if (params?.conversationId === conversation.id) {
      router.replace('/chat');
    } else {
      router.refresh();
    }
  };

  return (
    <SidebarMenuItem>
      {renaming ? (
        <div
          className={cn(
            'flex h-8 items-center gap-2 rounded-md px-2',
            active ? 'bg-sidebar-accent' : 'bg-muted',
          )}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              } else if (e.key === 'Escape') {
                setRenaming(false);
                setDraft(conversation.title ?? 'Untitled');
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-[500] leading-[1.3] text-foreground outline-none"
            aria-label="Rename conversation"
          />
        </div>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={conversation.title ?? 'Untitled'}
          size="default"
        >
          <Link
            href={`/chat/${conversation.id}`}
            className={cn(busy && 'pointer-events-none opacity-60')}
          >
            {conversation.pinned_at && (
              <Pin className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
            )}
            {/* ChatGPT-style row: title only. Three-dot menu replaces
                the trailing area on hover. Padding-right reserves
                room for the menu trigger so the title doesn't collide
                with it mid-hover. */}
            <span
              className={cn(
                'min-w-0 flex-1 truncate pr-5 leading-[1.3]',
                active ? 'font-[500]' : 'font-[400]',
              )}
              title={conversation.title ?? 'Untitled'}
            >
              {conversation.title ?? 'Untitled'}
            </span>
          </Link>
        </SidebarMenuButton>
      )}

      {!renaming && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Conversation options"
            className={cn(
              'absolute right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[3px] text-muted-foreground outline-none transition',
              'opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
              'hover:bg-foreground/10 hover:text-foreground',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-[180px]">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setRenaming(true);
              }}
              className="gap-2"
            >
              <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={togglePin} className="gap-2">
              {conversation.pinned_at ? (
                <>
                  <PinOff className="size-4" strokeWidth={1.75} aria-hidden />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="size-4" strokeWidth={1.75} aria-hidden />
                  Pin to top
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={confirmDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
