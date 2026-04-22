/**
 * Vitest setup — load .env.local into process.env before any module is
 * imported. Required for integration tests (RAG_LIVE_TESTS=1) because
 * they hit the real Supabase + Gemini pipeline, which reads env vars
 * through lib/env.ts. Next.js loads .env.local automatically; vitest
 * doesn't, so we do it manually here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // Strip matching surrounding quotes.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch {
  // No .env.local on CI — tests that need it will fail with a clear
  // env-var error, which is the right signal.
}
