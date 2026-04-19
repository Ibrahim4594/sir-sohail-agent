'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Drag handle that resizes the sidebar by mutating `--sidebar-width`
 * on the SidebarProvider's root div. Persists to both a cookie (for
 * SSR no-flash on next reload) and localStorage (instant client
 * reads).
 *
 * Implementation notes — the paranoid version, because two earlier
 * attempts missed a failure mode:
 *
 * 1. Listeners attach synchronously in onPointerDown (not via a
 *    useEffect triggered by setState). The React render window
 *    between mousedown and a state-driven useEffect is long enough
 *    on real devices to lose the first pointermoves.
 *
 * 2. Listeners attach to WINDOW, not the handle element. pointer
 *    capture is convenient but has inconsistent behaviour across
 *    browsers and silently breaks when the element is inside certain
 *    stacking contexts. Window listeners catch every event regardless
 *    of cursor position or occlusion.
 *
 * 3. The wrapper is located by walking up the DOM from the handle
 *    looking for an ancestor with `--sidebar-width` set inline —
 *    not by querySelector with a class containing a slash, which
 *    is the bug that silently killed the first two attempts.
 */

const MIN_WIDTH_PX = 200;
const MAX_WIDTH_PX = 520;
const DEFAULT_WIDTH_PX = 256;
const STORAGE_KEY = 'ibid_sidebar_width';
const COOKIE_KEY = 'sidebar_width';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persist(widthPx: number) {
  const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, widthPx));
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    /* storage disabled — cookie is the fallback */
  }
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API isn't universally shipped; document.cookie is the cross-browser path for a static numeric value
  document.cookie = `${COOKIE_KEY}=${clamped}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function findWrapper(start: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = start;
  while (el) {
    if (el.style?.getPropertyValue('--sidebar-width')) return el;
    el = el.parentElement;
  }
  return null;
}

export function SidebarResizer() {
  const { state, isMobile } = useSidebar();
  const handleRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);

  // Keep a fresh wrapper reference on mount. Not strictly required —
  // every callback re-scans — but avoids the first scan cost on first
  // interaction.
  useEffect(() => {
    findWrapper(handleRef.current);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const wrapper = findWrapper(handleRef.current);
    if (!wrapper) {
      // Diagnostic surface. If this fires, the SidebarProvider root
      // has lost its `--sidebar-width` inline style — which would be
      // a regression in components/ui/sidebar.tsx, not this file.
      console.warn('[SidebarResizer] could not locate sidebar wrapper');
      return;
    }
    e.preventDefault();

    setDragging(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, ev.clientX));
      wrapper.style.setProperty('--sidebar-width', `${clamped}px`);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(false);
      const val = wrapper.style.getPropertyValue('--sidebar-width');
      const num = Number.parseInt(val, 10);
      if (!Number.isNaN(num)) persist(num);
    };

    // Window listeners catch every pointer event regardless of where
    // the cursor is — no pointer capture, no element-bounded events.
    // This is the pattern that works everywhere.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  }, []);

  const onDoubleClick = useCallback(() => {
    const wrapper = findWrapper(handleRef.current);
    if (!wrapper) return;
    wrapper.style.setProperty('--sidebar-width', `${DEFAULT_WIDTH_PX}px`);
    persist(DEFAULT_WIDTH_PX);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const wrapper = findWrapper(handleRef.current);
    if (!wrapper) return;
    const current = Number.parseInt(wrapper.style.getPropertyValue('--sidebar-width'), 10);
    const base = Number.isNaN(current) ? DEFAULT_WIDTH_PX : current;
    const step = e.shiftKey ? 32 : 8;
    let next = base;
    if (e.key === 'ArrowLeft') next = base - step;
    else if (e.key === 'ArrowRight') next = base + step;
    else if (e.key === 'Home') next = MIN_WIDTH_PX;
    else if (e.key === 'End') next = MAX_WIDTH_PX;
    else return;
    e.preventDefault();
    const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, next));
    wrapper.style.setProperty('--sidebar-width', `${clamped}px`);
    persist(clamped);
  }, []);

  if (isMobile || state === 'collapsed') return null;

  return (
    <button
      ref={handleRef}
      type="button"
      aria-label="Resize sidebar. Drag, double-click to reset, arrow keys for fine steps."
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        'appearance-none border-0 bg-transparent p-0',
        'absolute inset-y-0 right-0 z-40 hidden w-2 translate-x-1/2 cursor-ew-resize touch-none select-none md:block',
        'outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-foreground/15 after:transition-colors',
        'hover:after:bg-foreground/50',
        dragging && 'after:bg-foreground/80',
      )}
    />
  );
}
