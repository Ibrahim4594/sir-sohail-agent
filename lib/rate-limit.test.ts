import { beforeEach, describe, expect, it } from 'vitest';
import { __resetRateLimit, checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimit();
  });

  it('allows requests up to the cap within the window', () => {
    const opts = { limit: 3, windowMs: 60_000 };
    const results = [
      checkRateLimit('u1', opts),
      checkRateLimit('u1', opts),
      checkRateLimit('u1', opts),
    ];
    expect(results.every((r) => r.allowed)).toBe(true);
    expect(results[2].remaining).toBe(0);
  });

  it('refuses the request that exceeds the cap', () => {
    const opts = { limit: 2, windowMs: 60_000 };
    checkRateLimit('u1', opts);
    checkRateLimit('u1', opts);
    const third = checkRateLimit('u1', opts);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.resetMs).toBeGreaterThan(0);
  });

  it('isolates buckets by key', () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit('alice', opts).allowed).toBe(true);
    expect(checkRateLimit('alice', opts).allowed).toBe(false);
    expect(checkRateLimit('bob', opts).allowed).toBe(true);
  });

  it('reports limit and resetMs consistently', () => {
    const opts = { limit: 5, windowMs: 30_000 };
    const first = checkRateLimit('u1', opts);
    expect(first.limit).toBe(5);
    expect(first.remaining).toBe(4);
    expect(first.resetMs).toBe(30_000);
  });
});
