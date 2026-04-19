/**
 * Golden RAG eval — measures retrieval quality end-to-end against the
 * real corpus. Gated behind RAG_LIVE_TESTS=1 because it needs the DB
 * and Ollama running. Run:
 *
 *   RAG_LIVE_TESTS=1 pnpm exec vitest run tests/integration/rag-eval.test.ts
 *
 * This is the measurement loop the project can run before and after
 * every retrieval / reranker / prompt change to quantify quality.
 * Metrics logged at the end: grounded-case recall (did we retrieve
 * chunks from the expected paper?), refusal precision (did we correctly
 * decline on out-of-corpus questions?), conversational routing.
 */
import { describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import { routeIntent } from '@/lib/prompt/intent-router';
import { searchChunks } from '@/lib/retrieval/search';
import { applyThreshold } from '@/lib/retrieval/threshold';
import fixture from '@/tests/fixtures/golden.json';

const LIVE = process.env.RAG_LIVE_TESTS === '1';
const describeLive = LIVE ? describe : describe.skip;

type Case = {
  id: string;
  kind: 'grounded' | 'refusal' | 'conversational';
  question: string;
  expectAnyTitleMatches?: string[];
};

const CASES = (fixture.cases as Case[]) ?? [];
const grounded = CASES.filter((c) => c.kind === 'grounded');
const refusals = CASES.filter((c) => c.kind === 'refusal');
const chats = CASES.filter((c) => c.kind === 'conversational');

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchesAny(title: string, needles: string[]): boolean {
  const t = normalize(title);
  return needles.some((n) => t.includes(normalize(n)));
}

describeLive('golden RAG eval', () => {
  describe('grounded cases — retrieval should surface the expected paper', () => {
    for (const c of grounded) {
      it(`${c.id} — "${c.question}"`, async () => {
        const e = env();
        const candidates = await searchChunks(c.question, {
          topK: e.RETRIEVAL_CANDIDATE_K,
          similarityThreshold: 0,
        });
        const gated = applyThreshold(candidates, e.RETRIEVAL_SIMILARITY_THRESHOLD);
        expect(gated.grounded).toBe(true);

        // Measure retrieval recall against the pre-rerank candidate
        // pool — that's the metric the RAG literature uses. The
        // reranker's job is to pick the best 8 of these for the
        // answer LLM; it may legitimately push a topically-relevant
        // paper below 8 in favour of one that more directly answers
        // the question. Recall is the retrieval property we want to
        // guard here.
        const titles = Array.from(new Set(gated.results.map((r) => r.documentTitle)));
        const hit = titles.some((t) => matchesAny(t, c.expectAnyTitleMatches ?? []));
        expect(
          hit,
          `Expected one of ${JSON.stringify(c.expectAnyTitleMatches)} in retrieved titles: ${JSON.stringify(titles)}`,
        ).toBe(true);
      });
    }
  });

  describe('refusal cases — retrieval should drop everything below threshold', () => {
    for (const c of refusals) {
      it(`${c.id} — "${c.question}"`, async () => {
        const e = env();
        const candidates = await searchChunks(c.question, {
          topK: e.RETRIEVAL_CANDIDATE_K,
          similarityThreshold: 0,
        });
        const gated = applyThreshold(candidates, e.RETRIEVAL_SIMILARITY_THRESHOLD);
        expect(
          gated.grounded,
          `Expected refusal for: ${c.question}. Top similarities: ${JSON.stringify(candidates.slice(0, 3).map((r) => r.similarity))}`,
        ).toBe(false);
      });
    }
  });

  describe('conversational cases — intent router should route away from retrieval', () => {
    for (const c of chats) {
      it(`${c.id} — "${c.question}"`, async () => {
        const result = await routeIntent({ history: [], latest: c.question });
        expect(result.kind).toBe('conversational');
        if (result.kind === 'conversational') {
          expect(result.reply.length).toBeGreaterThan(5);
        }
      });
    }
  });
});

/**
 * Non-live safety test — when RAG_LIVE_TESTS is NOT set, at least
 * ensure the fixture is structurally valid so stale entries can't rot
 * silently. This runs on every `pnpm test` without needing the DB.
 */
describe('golden fixture shape', () => {
  it('every case declares a kind and question', () => {
    expect(CASES.length).toBeGreaterThan(0);
    for (const c of CASES) {
      expect(c.id).toMatch(/^[a-z]+-\d+$/);
      expect(['grounded', 'refusal', 'conversational']).toContain(c.kind);
      expect(c.question).toBeTruthy();
      if (c.kind === 'grounded') {
        expect(Array.isArray(c.expectAnyTitleMatches)).toBe(true);
        expect(c.expectAnyTitleMatches?.length).toBeGreaterThan(0);
      }
    }
  });

  it('case IDs are unique', () => {
    const ids = new Set(CASES.map((c) => c.id));
    expect(ids.size).toBe(CASES.length);
  });
});
