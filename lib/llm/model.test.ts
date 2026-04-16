import { beforeEach, describe, expect, it, vi } from 'vitest';

// env() validates the whole schema, so satisfy all required vars before each test.
function setBaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
}

describe('getChatModel', () => {
  beforeEach(() => {
    vi.resetModules();
    setBaseEnv();
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
