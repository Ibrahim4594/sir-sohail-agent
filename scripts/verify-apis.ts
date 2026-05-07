/**
 * One-shot connectivity check for env schema, Supabase (DB + search_chunks RPC),
 * and Gemini (embedding + helper text). Run: pnpm verify:apis
 * Uses .env.local via package.json (--env-file). Does not print secrets.
 */
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embed, generateText } from 'ai';
import { env } from '@/lib/env';
import {
  EMBEDDING_PROVIDER_OPTIONS,
  getChatModel,
  getEmbeddingModel,
  getHelperModel,
} from '@/lib/llm/model';
import { createServiceRoleSupabase } from '@/lib/supabase/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEBUG_LOG = path.join(ROOT, 'debug-63f3f2.log');

function logDebug(payload: Record<string, unknown>) {
  appendFileSync(
    DEBUG_LOG,
    `${JSON.stringify({ sessionId: '63f3f2', timestamp: Date.now(), ...payload })}\n`,
  );
}

function summarizeUrl(u: string) {
  try {
    const h = new URL(u).host;
    return h;
  } catch {
    return 'invalid-url';
  }
}

async function main() {
  const results: Record<string, string> = {};

  console.log('[verify-apis] Checking env schema…');
  let e: ReturnType<typeof env>;
  try {
    e = env();
    results.env = `ok (gemini_models=${e.GEMINI_MODEL}+${e.GEMINI_HELPER_MODEL}, embed=${e.GEMINI_EMBEDDING_MODEL})`;
    logDebug({
      hypothesisId: 'VERIFY-ENV',
      location: 'scripts/verify-apis.ts',
      message: 'env parse ok',
      data: {
        supabaseHost: summarizeUrl(e.NEXT_PUBLIC_SUPABASE_URL),
        geminiEmbeddingModel: e.GEMINI_EMBEDDING_MODEL,
      },
    });
    console.log('  env:', results.env);
    console.log('  Supabase host:', summarizeUrl(e.NEXT_PUBLIC_SUPABASE_URL));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.env = `FAIL: ${msg}`;
    console.error('  FAIL', msg);
    logDebug({
      hypothesisId: 'VERIFY-ENV',
      location: 'scripts/verify-apis.ts',
      message: 'env parse failed',
      data: { err: msg.slice(0, 300) },
    });
    console.error('\nFix: copy .env.example → .env.local and fill GEMINI_* and Supabase vars.');
    process.exitCode = 1;
    printSummary(results);
    return;
  }

  console.log('\n[verify-apis] Supabase service-role (documents row)…');
  try {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase.from('documents').select('id').limit(1);
    if (error) throw new Error(error.message);
    results.supabaseDb = data?.length
      ? `ok (sample id present)`
      : 'ok (0 documents — schema reachable)';
    logDebug({
      hypothesisId: 'VERIFY-SUPA-DB',
      location: 'scripts/verify-apis.ts',
      message: 'documents select ok',
      data: { rowCount: data?.length ?? 0 },
    });
    console.log(' ', results.supabaseDb);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.supabaseDb = `FAIL: ${msg}`;
    console.error('  FAIL', msg);
    logDebug({
      hypothesisId: 'VERIFY-SUPA-DB',
      location: 'scripts/verify-apis.ts',
      message: 'documents select failed',
      data: { err: msg.slice(0, 400) },
    });
    process.exitCode = 1;
  }

  console.log('\n[verify-apis] Gemini embedding…');
  try {
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: 'hello',
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    });
    if (!embedding.length) throw new Error('empty embedding');
    results.geminiEmbed = `ok (dims=${embedding.length})`;
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-EMBED',
      location: 'scripts/verify-apis.ts',
      message: 'embed ok',
      data: { dims: embedding.length },
    });
    console.log(' ', results.geminiEmbed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.geminiEmbed = `FAIL: ${msg}`;
    console.error('  FAIL', msg);
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-EMBED',
      location: 'scripts/verify-apis.ts',
      message: 'embed failed',
      data: { err: msg.slice(0, 400) },
    });
    process.exitCode = 1;
  }

  console.log('\n[verify-apis] search_chunks RPC (needs embed + RPC)…');
  if (results.geminiEmbed.startsWith('ok')) {
    try {
      const { embedding } = await embed({
        model: getEmbeddingModel(),
        value: 'innovation education',
        providerOptions: EMBEDDING_PROVIDER_OPTIONS,
      });
      const supabase = createServiceRoleSupabase();
      const { data, error } = await supabase.rpc('search_chunks', {
        query_embedding: embedding as unknown as string,
        match_count: 3,
        similarity_threshold: 0,
      });
      if (error) throw new Error(error.message);
      const n = Array.isArray(data) ? data.length : 0;
      results.searchRpc = `ok (rows=${n})`;
      logDebug({
        hypothesisId: 'VERIFY-SEARCH-RPC',
        location: 'scripts/verify-apis.ts',
        message: 'search_chunks ok',
        data: { rows: n },
      });
      console.log(' ', results.searchRpc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.searchRpc = `FAIL: ${msg}`;
      console.error('  FAIL', msg);
      logDebug({
        hypothesisId: 'VERIFY-SEARCH-RPC',
        location: 'scripts/verify-apis.ts',
        message: 'search_chunks failed',
        data: { err: msg.slice(0, 400) },
      });
      process.exitCode = 1;
    }
  } else {
    results.searchRpc = 'skipped (embed failed)';
    console.log('  skipped — embedding failed');
  }

  console.log('\n[verify-apis] Gemini helper text…');
  try {
    const { text } = await generateText({
      model: getHelperModel(),
      prompt: 'Reply with exactly: OK',
      maxOutputTokens: 16,
    });
    results.geminiHelper = text.trim().length
      ? `ok (reply_len=${text.trim().length})`
      : 'FAIL: empty';
    if (!text.trim().length) process.exitCode = 1;
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-HELPER',
      location: 'scripts/verify-apis.ts',
      message: 'helper generateText ok',
      data: { replyLen: text.trim().length },
    });
    console.log(' ', results.geminiHelper);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.geminiHelper = `FAIL: ${msg}`;
    console.error('  FAIL', msg);
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-HELPER',
      location: 'scripts/verify-apis.ts',
      message: 'helper generateText failed',
      data: { err: msg.slice(0, 400) },
    });
    process.exitCode = 1;
  }

  console.log('\n[verify-apis] Gemini chat model (minimal)…');
  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt: 'Say OK.',
      maxOutputTokens: 8,
    });
    results.geminiChat = text.trim().length ? `ok` : 'FAIL: empty';
    if (!text.trim().length) process.exitCode = 1;
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-CHAT',
      location: 'scripts/verify-apis.ts',
      message: 'chat model generateText ok',
      data: { replyLen: text.trim().length },
    });
    console.log(' ', results.geminiChat);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.geminiChat = `FAIL: ${msg}`;
    console.error('  FAIL', msg);
    logDebug({
      hypothesisId: 'VERIFY-GEMINI-CHAT',
      location: 'scripts/verify-apis.ts',
      message: 'chat model failed',
      data: { err: msg.slice(0, 400) },
    });
    process.exitCode = 1;
  }

  printSummary(results);
}

function printSummary(results: Record<string, string>) {
  console.log('\n--- summary ---');
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  logDebug({
    hypothesisId: 'VERIFY-FATAL',
    message: String(e),
    data: {},
  });
  process.exitCode = 1;
});
