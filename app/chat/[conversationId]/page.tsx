import { notFound } from 'next/navigation';
import { ChatShell } from '@/components/chat/chat-shell';
import type { UIMessage } from '@/components/chat/types';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function ExistingChat({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createServerSupabase();
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
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
      citations: (m.citations as UIMessage['citations']) ?? undefined,
    }));

  return <ChatShell conversationId={conversationId} initialMessages={initialMessages} />;
}
