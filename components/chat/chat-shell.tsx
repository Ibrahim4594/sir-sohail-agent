'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PromptInputBox } from '@/components/ai-prompt-box';
import { ChatFeedback } from '@/components/chat/chat-feedback';
import { EmptyState } from './empty-state';
import { MessageList } from './message-list';
import { PdfPanel } from './pdf-panel';
import type { Citation, StreamEvent, UIMessage } from './types';

export function ChatShell({
  initialId,
  initialMessages,
}: {
  initialId?: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(initialId);
  const [panelCitation, setPanelCitation] = useState<Citation | null>(null);

  async function send(text: string) {
    const snapshot = messages;
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const updateAssistant = (fn: (m: UIMessage) => UIMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: [...snapshot, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat request failed (${res.status})`);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let finalId: string | undefined = convId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }
          if (event.type === 'text') {
            updateAssistant((m) => ({ ...m, content: m.content + event.value }));
          } else if (event.type === 'meta') {
            finalId = event.conversationId;
            if (!convId) setConvId(event.conversationId);
            updateAssistant((m) => ({
              ...m,
              citations: event.citations,
              streaming: false,
            }));
          } else if (event.type === 'error') {
            updateAssistant((m) => ({ ...m, error: event.message, streaming: false }));
          }
        }
      }

      updateAssistant((m) => ({ ...m, streaming: false }));

      if (!initialId && finalId) router.replace(`/chat/${finalId}`);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      updateAssistant((m) => ({
        ...m,
        streaming: false,
        content: m.content,
        error: message,
      }));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <MessageList messages={messages} onOpenCitation={setPanelCitation} />
        )}
      </div>

      <div className="shrink-0 px-6 pb-6 pt-3 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <PromptInputBox onSend={send} isLoading={streaming} />
        </div>
      </div>

      <PdfPanel citation={panelCitation} onClose={() => setPanelCitation(null)} />
      <ChatFeedback />
    </div>
  );
}
