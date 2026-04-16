import { describe, expect, it } from 'vitest';
import { chunkPage } from './chunk';

describe('chunkPage', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunkPage('Hello world.', { targetChars: 2000, overlapChars: 200 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Hello world.');
  });

  it('splits long text into multiple overlapping chunks', () => {
    const para = 'The quick brown fox jumps over the lazy dog. '.repeat(100);
    const chunks = chunkPage(para, { targetChars: 1000, overlapChars: 100 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1100);
    }
  });

  it('prefers sentence boundaries when splitting', () => {
    const text = 'Alpha sentence one. Beta sentence two. Gamma sentence three. '.repeat(50);
    const chunks = chunkPage(text, { targetChars: 600, overlapChars: 50 });
    for (const c of chunks) {
      expect(/[.!?]\s*$|^\S+/.test(c.trim())).toBe(true);
    }
  });

  it('returns empty array for empty input', () => {
    expect(chunkPage('', { targetChars: 2000, overlapChars: 200 })).toEqual([]);
    expect(chunkPage('   ', { targetChars: 2000, overlapChars: 200 })).toEqual([]);
  });
});
