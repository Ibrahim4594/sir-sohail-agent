import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider';

function getOllama() {
  return createOllama({
    baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api`,
  });
}

function getGoogle() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

export function getChatModel() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'gemini') {
    return getGoogle()(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  }
  return getOllama()(process.env.OLLAMA_MODEL || 'gemma4:e4b');
}

export function getEmbeddingModel() {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  if (provider === 'gemini') {
    return getGoogle().textEmbeddingModel(
      process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    );
  }
  return getOllama().embedding(process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text');
}
