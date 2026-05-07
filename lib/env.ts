import { z } from 'zod';

const schema = z.object({
  // Gemini is the one and only provider. The Ollama branch was
  // removed 2026-04-22 after Sir Sohail's meeting — see
  // .claude/memory/2026-04-22-sohail-meeting.txt. Rationale: one
  // provider means one embedding space, no dev/prod drift, and no
  // LLM_PROVIDER misconfiguration risk.
  GEMINI_API_KEY: z.string().min(1),
  // Two-tier model setup (added 2026-04-25 per Sir Sohail's request).
  // GEMINI_MODEL is the answer model — used for the main user-facing
  // generation, where quality matters most. GEMINI_HELPER_MODEL is
  // used for the four cheap pipeline calls (intent router, LLM-as-
  // judge reranker, entailment audit, title + follow-up generation)
  // where Flash quality is sufficient and the cost difference is ~10x.
  // Default to 2.5 Flash — reliably available; Pro preview often returns 503 at peak load.
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_HELPER_MODEL: z.string().default('gemini-flash-latest'),
  // gemini-embedding-001 natively outputs 3072 dims; we ask for 768
  // via outputDimensionality in getEmbeddingModel() so the stored
  // chunks.embedding column (pgvector(768)) doesn't need a schema
  // migration.
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Top-K = how many chunks reach the answer LLM after reranking.
  // Candidate-K = how many chunks are fetched from pgvector before the
  // reranker trims them. A wider candidate pool means the reranker has
  // more to work with; too wide and the rerank call gets slow.
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  RETRIEVAL_CANDIDATE_K: z.coerce.number().int().positive().default(20),
  // Similarity gate tuned for Gemini's embedding distribution on the
  // EMU innovation-ed corpus. A floor of 0.2 is enforced so a
  // misconfigured env can never silently disable safeguard #2 and
  // let the LLM answer from noise.
  RETRIEVAL_SIMILARITY_THRESHOLD: z.coerce.number().min(0.2).max(1).default(0.5),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export type Env = ReturnType<typeof env>;
