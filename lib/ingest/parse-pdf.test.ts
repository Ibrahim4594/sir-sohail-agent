import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePdf } from './parse-pdf';

describe('parsePdf', () => {
  it('returns pages of text from a real PDF', async () => {
    const buf = await readFile(path.resolve('tests/fixtures/sample.pdf'));
    const result = await parsePdf(new Uint8Array(buf));
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.pages.length).toBe(result.pageCount);
    expect(result.pages[0].length).toBeGreaterThan(0);
    expect(typeof result.pages[0]).toBe('string');
  });
});
