import { beforeEach, describe, expect, it, vi } from 'vitest';

// env() validates the whole schema, so satisfy all required vars before
// each test. GEMINI_API_KEY is now required (was optional until the
// 2026-04-22 Gemini-only switch), so it's part of the base set.
function setBaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
  process.env.GEMINI_API_KEY = 'test-key';
}

describe('getChatModel', () => {
  beforeEach(() => {
    vi.resetModules();
    setBaseEnv();
  });

  it('returns a Google model backed by the configured Gemini id', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    const { getChatModel } = await import('./model');
    const model = getChatModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('gemini');
  });
});

describe('getEmbeddingModel', () => {
  beforeEach(() => {
    vi.resetModules();
    setBaseEnv();
  });

  it('returns a Google embedding model', async () => {
    process.env.GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
    const { getEmbeddingModel } = await import('./model');
    const model = getEmbeddingModel();
    expect(model).toBeDefined();
    expect(String((model as { modelId?: string }).modelId || '')).toContain('embedding');
  });
});
