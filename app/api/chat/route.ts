import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkEntailment } from '@/lib/citation/entailment';
import { verifyCitations } from '@/lib/citation/verify';
import { env } from '@/lib/env';
import { getChatModel } from '@/lib/llm/model';
import { buildPrompt } from '@/lib/prompt/build-prompt';
import { routeIntent } from '@/lib/prompt/intent-router';
import { STRICT_GROUNDING_SYSTEM_PROMPT } from '@/lib/prompt/system-prompt';
import { checkRateLimit } from '@/lib/rate-limit';
import { rerankChunks } from '@/lib/retrieval/rerank';
import { searchChunks } from '@/lib/retrieval/search';
import { applyThreshold } from '@/lib/retrieval/threshold';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  | { type: 'text'; value: string }
  | { type: 'meta'; conversationId: string; citations: unknown[] }
  | { type: 'error'; message: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

// Soft refusal — kept short, scoped to the corpus, and ZERO paper titles.
// The previous version listed titles pulled from sub-threshold retrieval,
// which implied the corpus covered the asked-about topic (it did not).
// That falsely advertised the corpus and is now removed.
const REFUSAL_MESSAGE =
  "I'm Ibid — I only answer from the closed library of papers Prof. Sohail has loaded (innovation education, entrepreneurship pedagogy, project-based learning). This question isn't covered, so I'll decline rather than guess. Try rephrasing, or ask about a topic the library covers.";

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
          'Too many requests — please wait a moment and try again. Ibid is rate-limited to protect the shared corpus.',
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
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: lastUser.content.slice(0, 60) })
      .select('id')
      .single();
    if (convErr || !conv) {
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

  // Intent router — runs BEFORE retrieval. Classifies the latest
  // message into {research, greeting, thanks, farewell, meta,
  // emotional, other}. Research falls through to the grounded RAG
  // pipeline below (safeguards #1–#3 intact). Non-research returns a
  // curated canned reply — the LLM never authors user-visible text
  // on this path, so factual claims cannot leak.
  const intent = await routeIntent({ history: priorHistory, latest: lastUser.content });
  if (intent.kind === 'conversational') {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: intent.reply,
      citations: [] as unknown as Json,
    });

    const convStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent({ type: 'text', value: intent.reply }));
        controller.enqueue(encodeEvent({ type: 'meta', conversationId: convId, citations: [] }));
        controller.close();
      },
    });
    return new Response(convStream, {
      headers: { 'content-type': 'application/x-ndjson' },
    });
  }

  const e = env();
  // Retrieve a wider candidate pool so the LLM-as-judge reranker has
  // something to choose from. The reranker trims back to RETRIEVAL_TOP_K
  // before we hand chunks to the answer LLM.
  const rawResults = await searchChunks(lastUser.content, {
    topK: e.RETRIEVAL_CANDIDATE_K,
    similarityThreshold: 0,
  });
  const gated = applyThreshold(rawResults, e.RETRIEVAL_SIMILARITY_THRESHOLD);

  // Soft refusal — strict-grounding safeguard #2: skip the LLM entirely.
  if (!gated.grounded) {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: REFUSAL_MESSAGE,
      citations: [] as unknown as Json,
    });

    const refusalStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent({ type: 'text', value: REFUSAL_MESSAGE }));
        controller.enqueue(encodeEvent({ type: 'meta', conversationId: convId, citations: [] }));
        controller.close();
      },
    });
    return new Response(refusalStream, {
      headers: { 'content-type': 'application/x-ndjson' },
    });
  }

  // Rerank the candidate pool with the LLM-as-judge. The answer LLM
  // now sees only the chunks the reranker judged most directly
  // relevant, improving citation precision.
  const rankedChunks = await rerankChunks(lastUser.content, gated.results, {
    topK: e.RETRIEVAL_TOP_K,
  });

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

  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      let streamError: string | null = null;
      try {
        for await (const delta of result.textStream) {
          full += delta;
          controller.enqueue(encodeEvent({ type: 'text', value: delta }));
        }
      } catch (err) {
        streamError = err instanceof Error ? err.message : 'LLM stream failed';
        controller.enqueue(encodeEvent({ type: 'error', message: streamError }));
      }

      // Strict-grounding safeguard #3: verify every [N] marker maps to
      // a real source, then check entailment — does the cited chunk
      // actually support the claim? Closes the "illusion of groundedness"
      // gap where an LLM cites [3] but the claim has drifted from what
      // chunk 3 says. Marker-is-real → valid until entailment flips it.
      const initialCitations = verifyCitations(full, rankedChunks);
      const citations = streamError
        ? initialCitations
        : await checkEntailment(full, initialCitations, rankedChunks);
      const persistedContent = streamError
        ? `${full}\n\n[The response was cut off: ${streamError}]`
        : full;

      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: persistedContent,
        citations: citations as unknown as Json,
      });

      controller.enqueue(encodeEvent({ type: 'meta', conversationId: convId, citations }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}
