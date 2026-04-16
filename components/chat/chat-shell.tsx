'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PdfSidePanel } from '@/components/pdf/pdf-side-panel';
import { Composer } from './composer';
import { MessageList } from './message-list';
import type { UIMessage } from './types';

type CitationType = NonNullable<UIMessage['citations']>[number];

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

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let nextId = convId;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: 'text'; value: string }
            | { type: 'meta'; conversationId: string; citations: CitationType[] };
          if (event.type === 'text') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.value } : m,
              ),
            );
          } else if (event.type === 'meta') {
            nextId = event.conversationId;
            if (!convId) setConvId(event.conversationId);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m)),
            );
          }
        }
      }
      if (!initialId && nextId) router.replace(`/chat/${nextId}`);
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${String(e)}` } : m)),
      );
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
