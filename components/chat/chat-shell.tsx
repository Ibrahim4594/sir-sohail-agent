'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PromptInputBox } from '@/components/ai-prompt-box';
import { EmptyState } from './empty-state';
import { MessageList } from './message-list';
import { PdfPanel } from './pdf-panel';
import type { Citation, StreamEvent, UIMessage } from './types';

// Hard upper bound on a single chat turn. Local gemma on a cold model
// plus a full RAG round-trip (embed → search → rerank → stream → verify
// → entailment) typically settles in under 30s. 90s is the safety net
// — if we're still waiting this long, something is wrong and the user
// deserves an error instead of an indefinite blinking caret.
const STREAM_TIMEOUT_MS = 90_000;
// How long to wait before telling the user the model is warming up.
// The first response after a cold start of Ollama can take ~15-20s.
const WARMING_UP_AFTER_MS = 3_000;

export function ChatShell({
  initialId,
  initialMessages,
  displayName,
  avatarUrl,
}: {
  initialId?: string;
  initialMessages: UIMessage[];
  displayName?: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(initialId);
  const [panelCitation, setPanelCitation] = useState<Citation | null>(null);

  // Abort any in-flight stream if the component unmounts mid-response.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
    setWarmingUp(false);

    const updateAssistant = (fn: (m: UIMessage) => UIMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    const controller = new AbortController();
    abortRef.current = controller;

    const warmingTimer = setTimeout(() => setWarmingUp(true), WARMING_UP_AFTER_MS);
    const timeoutTimer = setTimeout(() => controller.abort('timeout'), STREAM_TIMEOUT_MS);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: [...snapshot, userMsg].map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat request failed (${res.status})`);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let finalId: string | undefined = convId;
      let firstByteSeen = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!firstByteSeen) {
          firstByteSeen = true;
          setWarmingUp(false);
        }
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
      const aborted = controller.signal.aborted;
      const message = aborted
        ? 'That took longer than expected. The model may be warming up — try again in a moment.'
        : e instanceof Error
          ? e.message
          : String(e);
      updateAssistant((m) => ({
        ...m,
        streaming: false,
        content: m.content,
        error: message,
      }));
    } finally {
      clearTimeout(warmingTimer);
      clearTimeout(timeoutTimer);
      abortRef.current = null;
      setStreaming(false);
      setWarmingUp(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <EmptyState onPick={send} displayName={displayName} />
        ) : (
          <MessageList
            messages={messages}
            onOpenCitation={setPanelCitation}
            avatarUrl={avatarUrl}
            displayName={displayName}
          />
        )}
      </div>

      {warmingUp && (
        <div
          className="pointer-events-none mx-auto w-full max-w-3xl px-6 pb-1 sm:px-10 lg:px-16"
          aria-live="polite"
        >
          <p className="label text-muted-foreground">
            <span className="inline-block animate-pulse">Warming up the model…</span>
          </p>
        </div>
      )}

      <div className="shrink-0 px-6 pb-6 pt-3 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <PromptInputBox onSend={send} isLoading={streaming} />
        </div>
      </div>

      <PdfPanel citation={panelCitation} onClose={() => setPanelCitation(null)} />
    </div>
  );
}
