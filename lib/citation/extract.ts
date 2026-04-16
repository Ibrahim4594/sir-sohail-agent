const CITATION_RE = /\[(\d{1,2})\]/g;

export function extractCitationNumbers(text: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    const n = Number(m[1]);
    if (n < 1) continue; // skips [0]
    // Skip if preceded by two or more consecutive word characters — likely identifier[N].
    // Single-char prefixes like "A[1]" are citation list contexts, not array indices.
    const idx = m.index ?? 0;
    if (idx >= 2 && /\w/.test(text[idx - 1]) && /\w/.test(text[idx - 2])) {
      continue;
    }
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
