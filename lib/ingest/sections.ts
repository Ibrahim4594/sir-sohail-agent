/**
 * IMRaD section detection for PDF corpus.
 *
 * Scans parsed page text for short, heading-like lines that match one of
 * a curated alias set (Introduction, Problem Statement, Purpose,
 * Methods, Results, Discussion, Conclusion, Implications, References).
 * Once a heading is seen, every subsequent line belongs to that section
 * until the next heading flips state.
 *
 * A few design points worth writing down:
 *
 * - We keep the output page-scoped so citation page numbers remain
 *   ground truth — if a section spans pages 11–13, we emit three spans,
 *   one per page, all tagged with the same section.
 * - Lines before the first heading land in `'other'`. That covers title
 *   pages, running headers, copyright boilerplate, and anything the
 *   regex set can't confidently classify.
 * - The detector is regex-based, not ML. The corpus is IMRaD-heavy
 *   (education / medical / social-science papers), so the heading
 *   language is predictable. Upgrade to a classifier only if eval shows
 *   we're missing >10% of conclusion sections.
 * - We do NOT require numeric prefixes ("3. Methods"), but we tolerate
 *   them — the alias regexes accept an optional leading number.
 */

export type Section =
  | 'abstract'
  | 'introduction'
  | 'problem'
  | 'purpose'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'implications'
  | 'references'
  | 'other';

/**
 * Priority-ordered — checked top-to-bottom, first match wins. More
 * specific patterns (Problem Statement, Research Purpose) sit above
 * generic ones (Introduction) so an ambiguous line like
 * "Introduction and Problem Statement" resolves to `problem`.
 */
const HEADING_ALIASES: Array<[Section, RegExp]> = [
  ['abstract', /^\s*(?:\d+\.?\s*)?abstract\b/i],
  [
    'problem',
    /^\s*(?:\d+\.?\s*)?(?:problem\s+statement|statement\s+of\s+the\s+problem|research\s+problem)\b/i,
  ],
  [
    'purpose',
    /^\s*(?:\d+\.?\s*)?(?:purpose(?:\s+of\s+the\s+study)?|research\s+(?:purpose|questions?|objectives?|aims?)|aims?\s+(?:and|of))\b/i,
  ],
  ['introduction', /^\s*(?:\d+\.?\s*)?(?:introduction|background)\b/i],
  [
    'methods',
    /^\s*(?:\d+\.?\s*)?(?:methods?|methodology|materials\s+and\s+methods|research\s+design|procedure)\b/i,
  ],
  ['results', /^\s*(?:\d+\.?\s*)?(?:results?|findings)\b/i],
  ['discussion', /^\s*(?:\d+\.?\s*)?discussion\b/i],
  [
    'conclusion',
    /^\s*(?:\d+\.?\s*)?(?:conclusions?|concluding\s+remarks|summary(?:\s+and\s+conclusions?)?|final\s+remarks)\b/i,
  ],
  [
    'implications',
    /^\s*(?:\d+\.?\s*)?(?:implications|recommendations|limitations|future\s+(?:work|research))\b/i,
  ],
  ['references', /^\s*(?:\d+\.?\s*)?(?:references|bibliography|works\s+cited)\b/i],
];

// A heading-qualified line is short, terminal-less, and usually sits
// alone on a line. These thresholds reject body sentences that happen
// to start with the word "Introduction" mid-paragraph.
const MAX_HEADING_CHARS = 80;
const DISQUALIFYING_TERMINAL = /[.!?;,:]\s*$/;

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_HEADING_CHARS) return false;
  if (DISQUALIFYING_TERMINAL.test(trimmed)) return false;
  return true;
}

function classifyHeading(line: string): Section | null {
  const trimmed = line.trim();
  for (const [section, re] of HEADING_ALIASES) {
    if (re.test(trimmed)) return section;
  }
  return null;
}

export type SectionSpan = {
  page: number; // 1-indexed, matching page_number in the chunks table
  section: Section;
  text: string;
};

/**
 * Segments a PDF's pages (as emitted by `parsePdf`) into one or more
 * spans per page, each tagged with the active section. Cross-page
 * section state is preserved — a "Conclusion" heading on page 12 keeps
 * applying to page 13 until another heading appears.
 */
export function segmentPagesBySection(pages: string[]): SectionSpan[] {
  const spans: SectionSpan[] = [];
  let currentSection: Section = 'other';

  for (let p = 0; p < pages.length; p++) {
    const raw = pages[p] ?? '';
    if (!raw.trim()) continue;

    const lines = raw.split(/\r?\n/);
    // Buffer the text that belongs to the active section on THIS page.
    // When a heading flips state mid-page, we flush the buffer as one
    // span and start a new one with the new section.
    let buffer: string[] = [];

    const flush = () => {
      const text = buffer.join('\n').trim();
      if (text) spans.push({ page: p + 1, section: currentSection, text });
      buffer = [];
    };

    for (const line of lines) {
      if (looksLikeHeading(line)) {
        const hit = classifyHeading(line);
        if (hit) {
          flush();
          currentSection = hit;
          // Skip the heading line itself; body text starts below.
          continue;
        }
      }
      buffer.push(line);
    }

    flush();
  }

  return spans;
}
