import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { env } from '@/lib/env';

/**
 * Gemini-only provider wiring. Since 2026-04-22 this project no longer
 * ships an Ollama branch (see .claude/memory/2026-04-22-sohail-meeting.txt).
 * Keeping a single provider gives us one embedding space for ingest +
 * query, no LLM_PROVIDER misconfiguration risk, and no dev/prod drift.
 *
 * Every feature-level LLM call (chat, reranker, intent router, title,
 * follow-ups, entailment audit) and every embed call (ingest + query)
 * routes through the two factories below. No feature code imports the
 * SDK directly.
 */

function getGoogle() {
  return createGoogleGenerativeAI({ apiKey: env().GEMINI_API_KEY });
}

/**
 * The answer model — Gemini 2.5 Flash by default (`env().GEMINI_MODEL`).
 * Flash avoids frequent 503s on preview Pro tiers during demand spikes.
 */
export function getChatModel(): LanguageModel {
  return getGoogle()(env().GEMINI_MODEL);
}

/**
 * The helper model — Gemini Flash by default. Used for the four
 * cheap pipeline calls behind every question:
 *   - intent router (classify into research / greeting / etc.)
 *   - LLM-as-judge reranker (score 20 chunks 0-10)
 *   - entailment audit (yes/no per cited claim)
 *   - title + follow-up generation
 * These calls are short-input / short-output classification or
 * scoring tasks where Flash is indistinguishable from Pro and ~10x
 * cheaper. The OCR script (scripts/ingest-ocr.ts) deliberately uses
 * getChatModel() instead because transcription quality benefits
 * from a larger model via GEMINI_MODEL if needed.
 */
export function getHelperModel(): LanguageModel {
  return getGoogle()(env().GEMINI_HELPER_MODEL);
}

export function getEmbeddingModel(): EmbeddingModel {
  return getGoogle().textEmbeddingModel(env().GEMINI_EMBEDDING_MODEL);
}

/**
 * Gemini embedding models natively output 3072 dims. Matryoshka-
 * trained so a truncated vector is still meaningful; the SDK exposes
 * that truncation via providerOptions.google.outputDimensionality on
 * the embed / embedMany call. We pin to 768 to keep the
 * chunks.embedding column (pgvector(768)) unchanged. Every call site
 * that embeds text MUST spread this in so ingest and query share the
 * same embedding space.
 */
export const EMBEDDING_PROVIDER_OPTIONS = {
  google: { outputDimensionality: 768 },
} as const;
