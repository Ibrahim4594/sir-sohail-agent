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
 * Why we walk the DOM instead of using querySelector:
 *   The shadcn SidebarProvider puts a class called
 *   `group/sidebar-wrapper` on its root. The forward slash is
 *   technically a valid CSS identifier character when escaped, but
 *   `document.querySelector('.group\\/sidebar-wrapper')` silently
 *   returns null in some browsers and the bug is invisible — the
 *   drag simply does nothing. Walking up from the resizer's own node
 *   looking for an element that has `--sidebar-width` set inline is
 *   both cheaper and completely reliable.
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

/**
 * Walk up the DOM from `start` looking for the nearest ancestor that
 * has `--sidebar-width` set inline. That's the SidebarProvider root
 * by design — it's where shadcn writes the width variable that the
 * inner sidebar panel consumes.
 */
function findWrapper(start: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = start;
  while (el) {
    if (el.style && el.style.getPropertyValue('--sidebar-width')) return el;
    el = el.parentElement;
  }
  return null;
}

export function SidebarResizer() {
  const { state, isMobile } = useSidebar();
  const handleRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // Locate the SidebarProvider root by walking up from our own DOM
  // node. The handle is mounted inside the Sidebar, which is a child
  // of the provider's wrapper — so a small DOM walk always finds it.
  useEffect(() => {
    wrapperRef.current = findWrapper(handleRef.current);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const clamped = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, e.clientX));
      wrapper.style.setProperty('--sidebar-width', `${clamped}px`);
    };
    const onUp = () => {
      setDragging(false);
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const val = wrapper.style.getPropertyValue('--sidebar-width');
      const num = Number.parseInt(val, 10);
      if (!Number.isNaN(num)) persist(num);
    };
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Defensive: if we somehow didn't find the wrapper (HMR, parent
    // re-mount, exotic DOM reshuffling), re-scan. Cheap — runs once
    // per drag start, not per mousemove.
    if (!wrapperRef.current) {
      wrapperRef.current = findWrapper(handleRef.current);
    }
    if (!wrapperRef.current) return;
    e.preventDefault();
    setDragging(true);
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
      aria-label="Resize sidebar. Drag, double-click to reset, or use arrow keys."
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        // Hit area: 8px wide, centred on the sidebar's right edge.
        // Visible line uses ::after to stay as a 2px wide hairline
        // regardless of the handle's larger click target — a pattern
        // lifted from VS Code's workbench resizer.
        'absolute inset-y-0 right-0 z-30 hidden w-2 translate-x-1/2 cursor-ew-resize md:block',
        'outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2',
        'after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-transparent after:transition-colors',
        'hover:after:bg-foreground/40',
        dragging && 'after:bg-foreground/60',
      )}
    />
  );
}
