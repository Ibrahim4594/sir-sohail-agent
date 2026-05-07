import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateText = vi.fn();

vi.mock('ai', () => ({
  generateText,
}));

vi.mock('@/lib/llm/model', () => ({
  getHelperModel: vi.fn(() => ({ modelId: 'stub' })),
}));

describe('routeIntent', () => {
  beforeEach(() => {
    vi.resetModules();
    generateText.mockReset();
    generateText.mockImplementation(() =>
      Promise.reject(new Error('generateText should not run for fast-path')),
    );
  });

  it('short-circuits greetings without calling Gemini', async () => {
    const { routeIntent } = await import('./intent-router');
    const r = await routeIntent({ history: [], latest: 'hey' });
    expect(r.kind).toBe('conversational');
    if (r.kind === 'conversational') expect(r.reply).toContain('Hey');
    expect(generateText).not.toHaveBeenCalled();
  });

  it('still routes compound messages to the classifier', async () => {
    generateText.mockImplementationOnce(() => Promise.resolve({ text: '[[RESEARCH]]' }));
    const { routeIntent } = await import('./intent-router');
    const r = await routeIntent({ history: [], latest: 'hey what is PBL' });
    expect(r.kind).toBe('research');
    expect(generateText).toHaveBeenCalled();
  });
});
