'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PdfSidePanel } from '@/components/pdf/pdf-side-panel';
import { Composer } from './composer';
import { MessageList } from './message-list';
import type { UIMessage } from './types';

type CitationType = NonNullable<UIMessage['citations']>[number];

type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'meta'; conversationId: string; citations: CitationType[] }
  | { type: 'error'; message: string };

export function ChatShell({
  conversationId: initialId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [panelCitation, setPanelCitation] = useState<CitationType | null>(null);
  const [convId, setConvId] = useState<string | undefined>(initialId);

  async function send(text: string) {
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '' };
    const snapshot = messages;

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
      if (!res.ok || !res.body) throw new Error(`Chat request failed (${res.status})`);

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
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === 'text') {
            updateAssistant((m) => ({ ...m, content: m.content + event.value }));
          } else if (event.type === 'meta') {
            finalId = event.conversationId;
            if (!convId) setConvId(event.conversationId);
            updateAssistant((m) => ({ ...m, citations: event.citations }));
          } else if (event.type === 'error') {
            updateAssistant((m) => ({
              ...m,
              content: `${m.content}\n\n[The response was cut off: ${event.message}]`,
            }));
          }
        }
      }

      if (!initialId && finalId) router.replace(`/chat/${finalId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      updateAssistant((m) => ({
        ...m,
        content: m.content || `Error: ${message}`,
      }));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_420px]">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} onOpenCitation={setPanelCitation} />
        </div>
        <div className="border-t bg-background/60 p-3 backdrop-blur">
          <Composer onSend={send} disabled={streaming} />
        </div>
      </div>
      <PdfSidePanel citation={panelCitation} onClose={() => setPanelCitation(null)} />
    </div>
  );
}
