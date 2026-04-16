import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { env } from '@/lib/env';

function getOllama() {
  return createOllama({ baseURL: `${env().OLLAMA_BASE_URL}/api` });
}

function getGoogle() {
  return createGoogleGenerativeAI({ apiKey: env().GEMINI_API_KEY });
}

export function getChatModel(): LanguageModel {
  const e = env();
  if (e.LLM_PROVIDER === 'gemini') {
    return getGoogle()(e.GEMINI_MODEL);
  }
  return getOllama()(e.OLLAMA_MODEL);
}

export function getEmbeddingModel(): EmbeddingModel {
  const e = env();
  if (e.LLM_PROVIDER === 'gemini') {
    return getGoogle().textEmbeddingModel(e.GEMINI_EMBEDDING_MODEL);
  }
  return getOllama().textEmbeddingModel(e.OLLAMA_EMBEDDING_MODEL);
}
