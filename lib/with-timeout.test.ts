import { describe, expect, it } from 'vitest';
import { rejectAfterTimeout, resolveAfterTimeout } from './with-timeout';

describe('rejectAfterTimeout', () => {
  it('resolves when the promise settles first', async () => {
    await expect(rejectAfterTimeout(Promise.resolve(42), 50, 'test')).resolves.toBe(42);
  });

  it('rejects when the deadline hits first', async () => {
    await expect(rejectAfterTimeout(new Promise(() => {}), 20, 'slow')).rejects.toThrow(
      /slow timed out/,
    );
  });
});

describe('resolveAfterTimeout', () => {
  it('returns the settled value before the deadline', async () => {
    const v = await resolveAfterTimeout(Promise.resolve('ok'), 50, 'fallback');
    expect(v).toBe('ok');
  });

  it('returns fallback after ms', async () => {
    const v = await resolveAfterTimeout(new Promise(() => {}), 30, 'fb');
    expect(v).toBe('fb');
  });
});
