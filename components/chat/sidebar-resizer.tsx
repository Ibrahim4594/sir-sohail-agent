'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Drag handle that resizes the sidebar by mutating `--sidebar-width`
 * on the SidebarProvider's root div. Persists to cookie (SSR read)
 * + localStorage (client fast path).
 *
 * Pattern lifted from lumpinif/shadcn-resizable-sidebar (211★ on
 * GitHub — the reference implementation for shadcn/ui sidebars):
 *
 *   1. mousemove / mouseup listeners attach to DOCUMENT at mount,
 *      not per-gesture. One set of handlers, always active.
 *   2. An `isInteracting` ref gates whether the handlers do any
 *      work — flipped true on mousedown, false on mouseup.
 *   3. A 5px dead-zone before `isDragging` goes true — prevents
 *      an accidental toggle-click from being interpreted as a
 *      drag.
 *   4. Refs (not state) for every drag-time mutable — no React
 *      re-render between mousedown and the first mousemove.
 *
 * Why this works where the previous pointer-events attempts
 * didn't: on some stacking contexts and inside shadcn's nested
 * fixed/relative layout, pointermove events bound per-gesture
 * were delivered to intermediate elements instead of bubbling
 * up. Listening on `document` unconditionally sidesteps the
 * delivery question entirely.
 */

const MIN_WIDTH_PX = 200;
const MAX_WIDTH_PX = 520;
const DEFAULT_WIDTH_PX = 256;
const DRAG_DEAD_ZONE_PX = 5;
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
  // Refs for drag state — using refs (not state) avoids a
  // re-render between mousedown and the first mousemove. Only the
  // visual `dragging` flag below uses useState, because it drives
  // the hairline colour change.
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  // Global mousemove / mouseup handlers — attached once to
  // document at mount. They early-return unless isInteracting is
  // true, so they cost nothing outside a drag.
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isInteractingRef.current) return;

      const deltaX = Math.abs(e.clientX - startXRef.current);
      if (!isDraggingRef.current && deltaX > DRAG_DEAD_ZONE_PX) {
        isDraggingRef.current = true;
        setDragging(true);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
      }

      if (!isDraggingRef.current) return;
      const wrapper = wrapperRef.current ?? findWrapper(handleRef.current);
      if (!wrapper) return;
      wrapperRef.current = wrapper;

      const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, e.clientX));
      wrapper.style.setProperty('--sidebar-width', `${clamped}px`);
    };

    const onMouseUp = () => {
      if (!isInteractingRef.current) return;
      const wasDragging = isDraggingRef.current;
      isInteractingRef.current = false;
      isDraggingRef.current = false;
      setDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (wasDragging && wrapperRef.current) {
        const val = wrapperRef.current.style.getPropertyValue('--sidebar-width');
        const num = Number.parseInt(val, 10);
        if (!Number.isNaN(num)) persist(num);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Fast-path: cache wrapper now so the move loop doesn't
    // re-walk the DOM on every event.
    wrapperRef.current = findWrapper(handleRef.current);
    isInteractingRef.current = true;
    startXRef.current = e.clientX;
    e.preventDefault();
  }, []);

  const onDoubleClick = useCallback(() => {
    const wrapper = wrapperRef.current ?? findWrapper(handleRef.current);
    if (!wrapper) return;
    wrapperRef.current = wrapper;
    wrapper.style.setProperty('--sidebar-width', `${DEFAULT_WIDTH_PX}px`);
    persist(DEFAULT_WIDTH_PX);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const wrapper = wrapperRef.current ?? findWrapper(handleRef.current);
    if (!wrapper) return;
    wrapperRef.current = wrapper;
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
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        'appearance-none border-0 bg-transparent p-0',
        'absolute inset-y-0 right-0 z-40 hidden w-2 translate-x-1/2 cursor-ew-resize select-none md:block',
        'outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-foreground/15 after:transition-colors',
        'hover:after:bg-foreground/50',
        dragging && 'after:bg-foreground/80',
      )}
    />
  );
}
