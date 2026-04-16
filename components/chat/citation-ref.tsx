'use client';
import { Fragment } from 'react';
import type { Citation } from './types';

const CITATION_RE = /\[(\d{1,2})\]/g;

/**
 * Splits an assistant message into text segments + clickable superscript
 * citation refs. Unknown markers (no matching source) render as muted + disabled.
 */
export function renderInlineCitations(
  text: string,
  citations: Citation[] | undefined,
  onOpen: (citation: Citation) => void,
): React.ReactNode {
  if (!citations || citations.length === 0) {
    return text;
  }

  const byMarker = new Map<number, Citation>();
  for (const c of citations) byMarker.set(c.marker, c);

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let key = 0;

  for (const match of text.matchAll(CITATION_RE)) {
    const idx = match.index ?? 0;
    const n = Number(match[1]);
    if (idx > lastIdx) {
      parts.push(<Fragment key={`t-${key++}`}>{text.slice(lastIdx, idx)}</Fragment>);
    }
    const citation = byMarker.get(n);
    if (citation?.valid) {
      parts.push(
        <button
          key={`c-${key++}-${n}`}
          type="button"
          className="cite"
          onClick={() => onOpen(citation)}
          aria-label={`Open source ${n} — ${citation.documentTitle}, page ${citation.pageNumber}`}
          title={`${citation.documentTitle} · p. ${citation.pageNumber}`}
        >
          {n}
        </button>,
      );
    } else {
      parts.push(
        <span
          key={`c-${key++}-${n}`}
          className="cite"
          style={{ color: 'var(--muted-foreground)', cursor: 'default' }}
          title="Unverified citation"
        >
          ?
        </span>,
      );
    }
    lastIdx = idx + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(<Fragment key={`t-${key++}`}>{text.slice(lastIdx)}</Fragment>);
  }

  return parts;
}
