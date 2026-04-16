import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyCitations } from '@/lib/citation/verify';
import { env } from '@/lib/env';
import { getChatModel } from '@/lib/llm/model';
import { buildPrompt, buildTopicsList } from '@/lib/prompt/build-prompt';
import { STRICT_GROUNDING_SYSTEM_PROMPT } from '@/lib/prompt/system-prompt';
import { searchChunks } from '@/lib/retrieval/search';
import { applyThreshold } from '@/lib/retrieval/threshold';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1),
});

type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'meta'; conversationId: string; citations: unknown[] }
  | { type: 'error'; message: string };

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function buildRefusal(topics: string[]): string {
  if (topics.length === 0) {
    return "I don't see information about that in the source documents.";
  }
  return (
    "I don't see information about that in the source documents. " +
    `However, the documents do cover:\n\n${topics.map((t) => `- ${t}`).join('\n')}` +
    '\n\nWould you like me to look into one of those?'
  );
}

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

  const messages = parsed.data.messages;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
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

  await supabase
    .from('messages')
    .insert({ conversation_id: convId, role: 'user', content: lastUser.content });

  const e = env();
  const rawResults = await searchChunks(lastUser.content, {
    topK: e.RETRIEVAL_TOP_K,
    similarityThreshold: 0,
  });
  const gated = applyThreshold(rawResults, e.RETRIEVAL_SIMILARITY_THRESHOLD);

  // Soft refusal — strict-grounding safeguard #2: skip the LLM entirely.
  if (!gated.grounded) {
    const refusal = buildRefusal(buildTopicsList(rawResults));
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: refusal,
      citations: [] as unknown as Json,
    });

    const refusalStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent({ type: 'text', value: refusal }));
        controller.enqueue(encodeEvent({ type: 'meta', conversationId: convId, citations: [] }));
        controller.close();
      },
    });
    return new Response(refusalStream, {
      headers: { 'content-type': 'application/x-ndjson' },
    });
  }

  const history = messages
    .slice(0, -1)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  const userPrompt = buildPrompt({
    chunks: gated.results,
    history,
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

      // Strict-grounding safeguard #3: verify every [N] marker maps to a real source.
      const citations = verifyCitations(full, gated.results);
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
