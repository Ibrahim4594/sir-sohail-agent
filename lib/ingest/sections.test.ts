import { describe, expect, it } from 'vitest';
import { segmentPagesBySection } from './sections';

describe('segmentPagesBySection', () => {
  it('classifies an unmarked page as "other"', () => {
    const spans = segmentPagesBySection(['Title Page\nRunning Header']);
    expect(spans).toHaveLength(1);
    expect(spans[0].section).toBe('other');
    expect(spans[0].page).toBe(1);
  });

  it('switches state on a plain "Introduction" heading', () => {
    const spans = segmentPagesBySection([
      'Some title\nIntroduction\nThis study examines how project-based learning...',
    ]);
    // Title page → other. Body after heading → introduction.
    expect(spans.map((s) => s.section)).toEqual(['other', 'introduction']);
    expect(spans[1].text).toContain('project-based learning');
  });

  it('recognises numeric-prefixed headings like "3. Methods"', () => {
    const spans = segmentPagesBySection([
      '1. Introduction\nIntro text.\n3. Methods\nMethod text.\n5. Conclusions\nConclusion text.',
    ]);
    const sections = spans.map((s) => s.section);
    expect(sections).toEqual(['introduction', 'methods', 'conclusion']);
  });

  it('prefers specific aliases over generic ones (Problem Statement > Introduction)', () => {
    const spans = segmentPagesBySection([
      'Problem Statement\nThe field lacks rigorous measures...',
    ]);
    expect(spans[0].section).toBe('problem');
  });

  it('recognises "Conclusions and Implications" as conclusion (first match wins)', () => {
    const spans = segmentPagesBySection([
      'Conclusions and Implications\nWe find that engagement scales...',
    ]);
    expect(spans[0].section).toBe('conclusion');
  });

  it('ignores mid-sentence heading words', () => {
    const spans = segmentPagesBySection([
      'The introduction of project-based learning into higher education has been debated.',
    ]);
    // No heading found — whole line is "other" body text.
    expect(spans).toHaveLength(1);
    expect(spans[0].section).toBe('other');
  });

  it('preserves page numbers across spans', () => {
    const spans = segmentPagesBySection([
      'Title Page',
      'Introduction\nThis study...',
      'More intro text on page 3.',
    ]);
    // Page 1: other (title). Page 2: other + introduction flush across
    // heading flip. Page 3: introduction continues (state preserved).
    const byPage = spans.map((s) => ({ page: s.page, section: s.section }));
    expect(byPage).toContainEqual({ page: 1, section: 'other' });
    expect(byPage).toContainEqual({ page: 2, section: 'introduction' });
    expect(byPage).toContainEqual({ page: 3, section: 'introduction' });
  });

  it('catches "Research Objectives" under purpose', () => {
    const spans = segmentPagesBySection(['Research Objectives\nWe seek to identify...']);
    expect(spans[0].section).toBe('purpose');
  });

  it('catches "Background" under introduction', () => {
    const spans = segmentPagesBySection(['Background\nEntrepreneurship education has grown...']);
    expect(spans[0].section).toBe('introduction');
  });

  it('skips empty pages without emitting an empty span', () => {
    const spans = segmentPagesBySection(['Introduction\nIntro body', '', '   ']);
    expect(spans).toHaveLength(1);
    expect(spans[0].section).toBe('introduction');
  });

  it('recognises References / Bibliography so they can be down-weighted', () => {
    const spans = segmentPagesBySection([
      'Introduction\nBody.\nReferences\nSmith 2020\nJones 2021',
    ]);
    const sections = spans.map((s) => s.section);
    expect(sections).toContain('references');
  });
});
