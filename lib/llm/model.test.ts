import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getChatModel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns an Ollama model when LLM_PROVIDER=ollama', async () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'gemma4:e4b';
    const { getChatModel } = await import('./model');
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('gemma4');
  });

  it('returns a Google model when LLM_PROVIDER=gemini', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-flash-latest';
    const { getChatModel } = await import('./model');
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('gemini');
  });
});
