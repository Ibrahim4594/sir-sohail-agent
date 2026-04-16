import { type LanguageModel, streamText } from 'ai';
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
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.format() }, { status: 400 });

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const messages = body.data.messages;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return NextResponse.json({ error: 'No user message' }, { status: 400 });

  // Get or create conversation
  let conversationId = body.data.conversationId;
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: lastUser.content.slice(0, 60) })
      .select('id')
      .single();
    if (convErr || !conv) return NextResponse.json({ error: convErr?.message }, { status: 500 });
    conversationId = conv.id;
  }

  // Persist user message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: lastUser.content,
  });

  // Retrieve + gate
  const e = env();
  const rawResults = await searchChunks(lastUser.content, {
    topK: e.RETRIEVAL_TOP_K,
    similarityThreshold: 0,
  });
  const gated = applyThreshold(rawResults, e.RETRIEVAL_SIMILARITY_THRESHOLD);

  // Soft refusal path — don't even call the LLM
  if (!gated.grounded) {
    const topics = buildTopicsList(rawResults);
    const refusal =
      topics.length > 0
        ? `I don't see information about that in the source documents. However, the documents do cover:\n\n${topics
            .map((t) => `- ${t}`)
            .join('\n')}\n\nWould you like me to look into one of those?`
        : `I don't see information about that in the source documents.`;

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: refusal,
      citations: [],
    });

    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(
            new TextEncoder().encode(`${JSON.stringify({ type: 'text', value: refusal })}\n`),
          );
          c.enqueue(
            new TextEncoder().encode(
              `${JSON.stringify({ type: 'meta', conversationId, citations: [] })}\n`,
            ),
          );
          c.close();
        },
      }),
      { headers: { 'content-type': 'application/x-ndjson' } },
    );
  }

  // Build prompt
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  const userPrompt = buildPrompt({
    chunks: gated.results,
    history,
    question: lastUser.content,
  });

  // Stream and accumulate
  const result = streamText({
    model: getChatModel() as unknown as LanguageModel,
    messages: [
      { role: 'system', content: STRICT_GROUNDING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  let full = '';
  const encoder = new TextEncoder();
  const convId = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      for await (const delta of result.textStream) {
        full += delta;
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'text', value: delta })}\n`));
      }

      const citations = verifyCitations(full, gated.results);
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: full,
        citations: citations as unknown as Json,
      });

      controller.enqueue(
        encoder.encode(`${JSON.stringify({ type: 'meta', conversationId: convId, citations })}\n`),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}
