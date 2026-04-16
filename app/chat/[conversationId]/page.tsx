import { notFound } from 'next/navigation';
import { ChatShell } from '@/components/chat/chat-shell';
import type { Citation, UIMessage } from '@/components/chat/types';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function ExistingConversation({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createServerSupabase();

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, title')
    .eq('id', conversationId)
    .single();
  if (!conv) notFound();

  const { data: msgs } = await supabase
    .from('messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const initialMessages: UIMessage[] = (msgs ?? [])
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      citations: (m.citations as unknown as Citation[] | null) ?? undefined,
    }));

  return <ChatShell initialId={conversationId} initialMessages={initialMessages} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createServerSupabase();
  const { data: conv } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .single();
  return { title: conv?.title || 'Conversation' };
}
