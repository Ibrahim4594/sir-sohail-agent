'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Drag handle that resizes the sidebar by mutating `--sidebar-width`
 * on the SidebarProvider's root div. Persists to both a cookie (for
 * SSR no-flash on next reload) and localStorage (instant client
 * reads). Respects the shadcn Sidebar's collapsed + mobile states by
 * unmounting when the sidebar isn't visible as a resizable panel.
 *
 * Double-click resets to the default width.
 *
 * Why pointer events + attach-listeners-on-pointerdown:
 *   The earlier React-state-driven approach (setDragging(true) →
 *   useEffect attaches window mousemove) had a gap between the
 *   mousedown and React's commit where fast mouse movement could
 *   slip through without any listener attached. Attaching the move/
 *   up handlers synchronously inside the pointerdown callback closes
 *   that gap — the listener exists before the next event fires.
 *
 *   setPointerCapture pins all subsequent pointer events for that
 *   gesture to this element, so even if the cursor leaves the handle
 *   during the drag, every move still reaches us. This is the pattern
 *   VS Code's workbench resizer and Linear's sidebar both use.
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
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // Locate the SidebarProvider on mount. Used as a fast path; every
  // gesture re-scans as a fallback so HMR reshuffling can't brick the
  // feature.
  useEffect(() => {
    wrapperRef.current = findWrapper(handleRef.current);
  }, []);

  const resolveWrapper = useCallback(() => {
    if (wrapperRef.current?.isConnected) return wrapperRef.current;
    wrapperRef.current = findWrapper(handleRef.current);
    return wrapperRef.current;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      const wrapper = resolveWrapper();
      if (!wrapper) return;
      e.preventDefault();
      e.stopPropagation();

      // Lock all subsequent pointer events for this gesture to the
      // handle — even if the cursor leaves the 8px hit zone, every
      // move still reaches us.
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* some browsers throw on detached capture — harmless */
      }

      setDragging(true);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: PointerEvent) => {
        const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, ev.clientX));
        wrapper.style.setProperty('--sidebar-width', `${clamped}px`);
      };
      const cleanup = () => {
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', cleanup);
        target.removeEventListener('pointercancel', cleanup);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setDragging(false);
        const val = wrapper.style.getPropertyValue('--sidebar-width');
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) persist(num);
      };

      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', cleanup);
      target.addEventListener('pointercancel', cleanup);
    },
    [resolveWrapper],
  );

  const onDoubleClick = useCallback(() => {
    const wrapper = resolveWrapper();
    if (!wrapper) return;
    wrapper.style.setProperty('--sidebar-width', `${DEFAULT_WIDTH_PX}px`);
    persist(DEFAULT_WIDTH_PX);
  }, [resolveWrapper]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const wrapper = resolveWrapper();
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
    },
    [resolveWrapper],
  );

  if (isMobile || state === 'collapsed') return null;

  return (
    <button
      ref={handleRef}
      type="button"
      aria-label="Resize sidebar. Drag, double-click to reset, or use arrow keys."
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        // Reset native button styling so the div-like layout below works.
        'appearance-none border-0 bg-transparent p-0',
        'absolute inset-y-0 right-0 z-30 hidden w-2 translate-x-1/2 cursor-ew-resize touch-none select-none md:block',
        'outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-transparent after:transition-colors',
        'hover:after:bg-foreground/40',
        dragging && 'after:bg-foreground/60',
      )}
    />
  );
}
