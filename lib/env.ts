import { z } from 'zod';

const schema = z.object({
  LLM_PROVIDER: z.enum(['ollama', 'gemini']).default('ollama'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('gemma4:e4b'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  RETRIEVAL_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.4),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export type Env = ReturnType<typeof env>;
