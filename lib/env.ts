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
  // Top-K = how many chunks reach the answer LLM after reranking.
  // Candidate-K = how many chunks are fetched from pgvector before the
  // reranker trims them. A wider candidate pool means the reranker has
  // more to work with; too wide and the rerank call gets slow.
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  RETRIEVAL_CANDIDATE_K: z.coerce.number().int().positive().default(20),
  // Tuned for nomic-embed-text v1 on the EMU innovation-ed corpus —
  // its similarity distribution clusters higher than v2-moe, so the
  // old 0.4 gate let too many off-topic queries through. Measured in
  // the golden eval: 0.5 restores refusal precision without material
  // damage to grounded recall.
  //
  // SECURITY NOTE: the lower bound is 0.2, not 0. A threshold of 0
  // would pass every retrieved chunk through the grounding gate,
  // silently disabling safeguard #2 and letting the LLM answer from
  // noise. Requiring a floor means a misconfigured env var fails
  // loud at startup instead of ungating the corpus.
  RETRIEVAL_SIMILARITY_THRESHOLD: z.coerce.number().min(0.2).max(1).default(0.5),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export type Env = ReturnType<typeof env>;
