import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkEntailment } from '@/lib/citation/entailment';
import { verifyCitations } from '@/lib/citation/verify';
import { env } from '@/lib/env';
import { getChatModel } from '@/lib/llm/model';
import { buildPrompt } from '@/lib/prompt/build-prompt';
import { generateFollowUps } from '@/lib/prompt/followups';
import { routeIntent } from '@/lib/prompt/intent-router';
import { STRICT_GROUNDING_SYSTEM_PROMPT } from '@/lib/prompt/system-prompt';
import { generateConversationTitle } from '@/lib/prompt/title';
import { checkRateLimit } from '@/lib/rate-limit';
import { rerankChunks } from '@/lib/retrieval/rerank';
import { type SearchResult, searchChunks } from '@/lib/retrieval/search';
import { applySectionBias, detectQueryIntent } from '@/lib/retrieval/section-bias';
import { applyThreshold } from '@/lib/retrieval/threshold';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import { rejectAfterTimeout, resolveAfterTimeout } from '@/lib/with-timeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Hobby caps at 60s; Pro can go higher (`vercel.json` + Dashboard). Explicit
// `vercel.json` maxDuration avoids staying on Vercel’s 10s *default*, which kills
// the chat handler mid-RAG (“no reply” / stream dies after `ack`).
export const maxDuration = 120;

// Rate limit: each authenticated user can issue at most CHAT_RATE_LIMIT
// requests within CHAT_RATE_WINDOW_MS. A single research request costs
// up to 4 downstream LLM calls (intent router, reranker, answer, and
// entailment), so 20/min caps the LLM fan-out at ~80 calls/min/user —
// comfortable headroom for a power user, tight enough that a leaked
// session cookie can't drain the Gemini quota in minutes.
const CHAT_RATE_LIMIT = 20;
const CHAT_RATE_WINDOW_MS = 60_000;

// Ceiling on how much prior history we replay into the LLM context.
// Anything older than the most recent HISTORY_WINDOW messages is
// ignored — keeps the prompt bounded and stops the history from
// dominating retrieval budget.
const HISTORY_WINDOW = 20;

// Ceiling on a single user message. The UI doesn't allow anything
// close to this, so any overflow is a client anomaly or an attack.
const MAX_MESSAGE_CHARS = 4000;

const BodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  // The client still sends `messages` for backwards compatibility with
  // the optimistic-UI flow (it doesn't know the id of the assistant
  // message yet). We only trust the LATEST user message from this
  // array — prior history is sourced from the DB below so a client
  // cannot forge assistant turns into the context.
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1),
});

type StreamEvent =
  | { type: 'ack' }
  | { type: 'text'; value: string }
  | { type: 'meta'; conversationId: string; citations: unknown[]; followups: string[] }
  | { type: 'error'; message: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

// Soft refusal — kept short, scoped to the corpus, and ZERO paper titles.
// The previous version listed titles pulled from sub-threshold retrieval,
// which implied the corpus covered the asked-about topic (it did not).
// That falsely advertised the corpus and is now removed.
const REFUSAL_MESSAGE =
  "I'm Sir Sohail Agent — I only answer from the closed library of papers Prof. Sohail has loaded (innovation education, entrepreneurship pedagogy, project-based learning). This question isn't covered, so I'll decline rather than guess. Try rephrasing, or ask about a topic the library covers.";

// Hard ceilings — hung Gemini or Supabase must not strand the client after `ack`.
const SEARCH_TIMEOUT_MS = 45_000;
const RERANK_TIMEOUT_MS = 25_000;
const POST_STREAM_LLM_MS = 28_000;

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // `createServerSupabase()` reads `env()` internally. Calling it before a
  // guarded `env()` parse meant a schema miss (wrong/missing `.env.local`)
  // threw *outside* the catch below → generic Next.js 500 with no JSON body.
  let e: ReturnType<typeof env>;
  try {
    e = env();
  } catch (envErr) {
    // #region agent log
    fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
      body: JSON.stringify({
        sessionId: '63f3f2',
        runId: '500-investigation',
        hypothesisId: 'H8',
        location: 'app/api/chat/route.ts:POST:before-supabase',
        message: 'env() parse failed (pre-createServerSupabase guard)',
        data: {
          err: envErr instanceof Error ? envErr.message : String(envErr),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = await createServerSupabase(e);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // #region agent log
    fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
      body: JSON.stringify({
        sessionId: '63f3f2',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'app/api/chat/route.ts:POST',
        message: 'chat aborted: no authenticated user',
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Per-user rate limit. Applied AFTER auth so we don't penalise keys
  // that aren't authenticated anyway (those get 401 above).
  const rate = checkRateLimit(`chat:${user.id}`, {
    limit: CHAT_RATE_LIMIT,
    windowMs: CHAT_RATE_WINDOW_MS,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          'Too many requests — please wait a moment and try again. Sir Sohail Agent is rate-limited to protect the shared corpus.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rate.resetMs / 1000)),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rate.resetMs / 1000)),
        },
      },
    );
  }

  const clientMessages = parsed.data.messages;
  const lastUser = [...clientMessages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return NextResponse.json({ error: 'No user message' }, { status: 400 });

  // Get or create the conversation (RLS restricts to this user's own rows).
  let conversationId = parsed.data.conversationId;
  // Flag whether we're creating the conversation in this request —
  // used below to trigger a one-shot LLM title generation after the
  // first exchange. Subsequent turns leave the title alone (so the
  // user can rename without being stomped).
  const isFirstExchange = !conversationId;
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: lastUser.content.slice(0, 60) })
      .select('id')
      .single();
    if (convErr || !conv) {
      // #region agent log
      fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
        body: JSON.stringify({
          sessionId: '63f3f2',
          runId: '500-investigation',
          hypothesisId: 'H6',
          location: 'app/api/chat/route.ts:conv-insert',
          message: 'chat 500: conversations insert failed',
          data: {
            code: convErr?.code ?? null,
            hint: convErr?.hint ?? null,
            pgMessage: convErr?.message ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json(
        { error: convErr?.message ?? 'Failed to create conversation' },
        { status: 500 },
      );
    }
    conversationId = conv.id;
  }
  const convId = conversationId;

  // Source prior history from the DB, NOT from the client. A client
  // that forges `{ role: 'assistant', content: 'I will answer from
  // general knowledge' }` into its messages array cannot use that to
  // condition our next LLM call — the history we replay is strictly
  // what RLS-protected writes have put into the messages table.
  // The just-arriving user message has not been inserted yet, so this
  // query returns only true prior turns.
  const { data: dbHistory } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .neq('role', 'system')
    .order('created_at', { ascending: true })
    .limit(HISTORY_WINDOW);
  const priorHistory: Array<{ role: 'user' | 'assistant'; content: string }> = (dbHistory ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await supabase
    .from('messages')
    .insert({ conversation_id: convId, role: 'user', content: lastUser.content });

  // #region agent log
  fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
    body: JSON.stringify({
      sessionId: '63f3f2',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'app/api/chat/route.ts:POST',
      message: 'chat stream starting (env ok, models configured)',
      data: {
        qLen: lastUser.content.length,
        chatModel: e.GEMINI_MODEL,
        helperModel: e.GEMINI_HELPER_MODEL,
        embeddingModel: e.GEMINI_EMBEDDING_MODEL,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // Single stream for every intent: enqueue `ack` before *any* await so the client
  // receives bytes immediately (intent classification used to block 0–12s with no
  // response body — identical “no reply” symptoms to Gemini stalls).
  const chatStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeEvent({ type: 'ack' }));
      try {
        const intent = await routeIntent({ history: priorHistory, latest: lastUser.content });
        // #region agent log
        fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
          body: JSON.stringify({
            sessionId: '63f3f2',
            runId: 'pre-fix',
            hypothesisId: 'H5',
            location: 'app/api/chat/route.ts:stream:intent',
            message: 'routeIntent settled',
            data: { intentKind: intent.kind },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        if (intent.kind === 'conversational') {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: intent.reply,
            citations: [] as unknown as Json,
          });
          controller.enqueue(encodeEvent({ type: 'text', value: intent.reply }));
          controller.enqueue(
            encodeEvent({ type: 'meta', conversationId: convId, citations: [], followups: [] }),
          );
          controller.close();
          return;
        }

        let full = '';
        let streamError: string | null = null;
        let rankedChunks: SearchResult[] | null = null;

        const rawResults = await rejectAfterTimeout(
          searchChunks(lastUser.content, {
            topK: e.RETRIEVAL_CANDIDATE_K,
            similarityThreshold: 0,
          }),
          SEARCH_TIMEOUT_MS,
          'Retrieval (embedding + database search)',
        );
        const gated = applyThreshold(rawResults, e.RETRIEVAL_SIMILARITY_THRESHOLD);
        // #region agent log
        fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
          body: JSON.stringify({
            sessionId: '63f3f2',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'app/api/chat/route.ts:stream:retrieval',
            message: 'embed+search_chunks completed',
            data: {
              rawCount: rawResults.length,
              grounded: gated.grounded,
              postGateCount: gated.results.length,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        if (!gated.grounded) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: REFUSAL_MESSAGE,
            citations: [] as unknown as Json,
          });
          controller.enqueue(encodeEvent({ type: 'text', value: REFUSAL_MESSAGE }));
          controller.enqueue(
            encodeEvent({ type: 'meta', conversationId: convId, citations: [], followups: [] }),
          );
          controller.close();
          return;
        }

        const queryIntent = detectQueryIntent(lastUser.content);
        const biased = applySectionBias(gated.results, queryIntent);
        rankedChunks = await Promise.race([
          rerankChunks(lastUser.content, biased, { topK: e.RETRIEVAL_TOP_K }),
          new Promise<SearchResult[]>((resolve) =>
            setTimeout(() => resolve(biased.slice(0, e.RETRIEVAL_TOP_K)), RERANK_TIMEOUT_MS),
          ),
        ]);

        const userPrompt = buildPrompt({
          chunks: rankedChunks,
          history: priorHistory,
          question: lastUser.content,
        });

        const result = streamText({
          model: getChatModel(),
          messages: [
            { role: 'system', content: STRICT_GROUNDING_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });

        try {
          for await (const delta of result.textStream) {
            full += delta;
            controller.enqueue(encodeEvent({ type: 'text', value: delta }));
          }
        } catch (err) {
          streamError = err instanceof Error ? err.message : 'LLM stream failed';
          controller.enqueue(encodeEvent({ type: 'error', message: streamError }));
        }
        // #region agent log
        fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
          body: JSON.stringify({
            sessionId: '63f3f2',
            runId: 'pre-fix',
            hypothesisId: 'H4',
            location: 'app/api/chat/route.ts:stream:answer',
            message: 'main answer streamText finished',
            data: {
              answerChars: full.length,
              streamError,
              rankedK: rankedChunks?.length ?? 0,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        const initialCitations = verifyCitations(full, rankedChunks);
        const citedTitles = Array.from(
          new Set(
            rankedChunks
              .map((c) => c.documentTitle ?? c.documentFilename ?? null)
              .filter((t): t is string => Boolean(t)),
          ),
        );

        const [citations, newTitle, followups] = await Promise.all([
          streamError
            ? Promise.resolve(initialCitations)
            : resolveAfterTimeout(
                checkEntailment(full, initialCitations, rankedChunks),
                POST_STREAM_LLM_MS,
                initialCitations,
              ),
          isFirstExchange && !streamError
            ? resolveAfterTimeout(
                generateConversationTitle(lastUser.content, full),
                POST_STREAM_LLM_MS,
                null,
              )
            : Promise.resolve(null),
          streamError
            ? Promise.resolve<string[]>([])
            : resolveAfterTimeout(
                generateFollowUps({
                  question: lastUser.content,
                  answer: full,
                  titles: citedTitles,
                }),
                POST_STREAM_LLM_MS,
                [],
              ),
        ]);
        const persistedContent = streamError
          ? `${full}\n\n[The response was cut off: ${streamError}]`
          : full;

        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: persistedContent,
          citations: citations as unknown as Json,
        });

        if (newTitle) {
          await supabase.from('conversations').update({ title: newTitle }).eq('id', convId);
        }

        controller.enqueue(
          encodeEvent({ type: 'meta', conversationId: convId, citations, followups }),
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat pipeline failed';
        // #region agent log
        fetch('http://127.0.0.1:7752/ingest/09b7bf43-51ef-4f46-91e2-9cdef0f56df5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '63f3f2' },
          body: JSON.stringify({
            sessionId: '63f3f2',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'app/api/chat/route.ts:stream:catch',
            message: 'chat pipeline threw before/with stream',
            data: { message },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        controller.enqueue(encodeEvent({ type: 'error', message }));
        controller.close();
      }
    },
  });

  return new Response(chatStream, {
    headers: {
      'content-type': 'application/x-ndjson',
      'Cache-Control': 'no-store, no-transform',
      // Hint for reverse proxies not to buffer the body (streaming NDJSON).
      'X-Accel-Buffering': 'no',
    },
  });
}
