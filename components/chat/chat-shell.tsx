'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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

  async function send(text: string, opts: { regenerate?: boolean; snapshot?: UIMessage[] } = {}) {
    // `regenerate` mode re-runs the last user message. The caller
    // trims the messages array down to the last user turn and passes
    // it via `opts.snapshot` so we don't race React's state commit —
    // reading `messages` from state here would give us a stale value
    // inside a queueMicrotask/useCallback path.
    const snapshot = opts.snapshot ?? messages;
    let userMsg: UIMessage;
    let workingMessages: UIMessage[];
    if (opts.regenerate) {
      const last = snapshot[snapshot.length - 1];
      if (!last || last.role !== 'user') return;
      userMsg = last;
      workingMessages = snapshot;
    } else {
      userMsg = { id: crypto.randomUUID(), role: 'user', content: text };
      workingMessages = [...snapshot, userMsg];
    }
    const assistantId = crypto.randomUUID();
    const assistantMsg: UIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };

    setMessages([...workingMessages, assistantMsg]);
    setStreaming(true);
    setWarmingUp(false);

    const updateAssistant = (fn: (m: UIMessage) => UIMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    // Token coalescing. A local LLM emits 40–120 tokens/sec; one
    // setMessages per token means 40+ React commits per second, each
    // mapping over the whole messages array and triggering a scroll
    // in the child. We buffer incoming tokens in a ref and flush on a
    // 50ms timer — same output, ~1/5 the commits. Pattern borrowed
    // from ChatGPT (reverse-engineered) and common in streaming UIs.
    let tokenBuffer = '';
    let flushTimer: number | null = null;
    const flushTokens = () => {
      flushTimer = null;
      if (!tokenBuffer) return;
      const chunk = tokenBuffer;
      tokenBuffer = '';
      updateAssistant((m) => ({ ...m, content: m.content + chunk }));
    };
    const scheduleFlush = () => {
      if (flushTimer !== null) return;
      flushTimer = window.setTimeout(flushTokens, 50);
    };
    const flushNow = () => {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushTokens();
    };

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
          messages: workingMessages.map(({ role, content }) => ({ role, content })),
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
            tokenBuffer += event.value;
            scheduleFlush();
          } else if (event.type === 'meta') {
            // Flush any buffered tokens before committing the meta
            // event so citations never land before their text.
            flushNow();
            finalId = event.conversationId;
            if (!convId) setConvId(event.conversationId);
            updateAssistant((m) => ({
              ...m,
              citations: event.citations,
              followups: event.followups,
              streaming: false,
            }));
          } else if (event.type === 'error') {
            flushNow();
            updateAssistant((m) => ({ ...m, error: event.message, streaming: false }));
          }
        }
      }

      flushNow();
      updateAssistant((m) => ({ ...m, streaming: false }));

      if (!initialId && finalId) router.replace(`/chat/${finalId}`);
      router.refresh();
    } catch (e) {
      const aborted = controller.signal.aborted;
      // Distinguish user-stop ("user") from timeout ("timeout") so the
      // UI shows the right language instead of a generic "took longer
      // than expected" for a deliberate stop.
      const reason = (controller.signal as AbortSignal & { reason?: unknown }).reason;
      const userStopped = aborted && reason === 'user';
      const message = userStopped
        ? 'Stopped. Ask again or regenerate when ready.'
        : aborted
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

  // P0.1 — Real stop button. Aborts the in-flight fetch with a
  // distinguishable reason so the catch branch above can render a
  // "Stopped." message instead of a generic timeout. No-op if
  // nothing is streaming.
  const onStop = useCallback(() => {
    abortRef.current?.abort('user');
  }, []);

  // Click handler for the follow-up suggestion chips rendered under the
  // last assistant message. Forwards the chosen prompt to `send` as if
  // the user had typed it. No-op while a stream is in flight to avoid
  // racing two requests.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `send` is stable for the same reason as `regenerate` below
  const askFollowup = useCallback(
    (text: string) => {
      if (streaming) return;
      send(text);
    },
    [streaming],
  );

  // P1.1 — Regenerate the last assistant response. Trim the visible
  // messages down to the last user turn and re-send with the trimmed
  // snapshot passed explicitly so `send` doesn't race React's state
  // commit. The previous attempt stays in the DB (we don't delete it
  // — the user keeps a record of what happened).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `send` is a stable component-scoped function, and passing `snapshot` explicitly sidesteps the stale-closure concern
  const regenerate = useCallback(() => {
    if (streaming) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const trimmed = messages.slice(0, lastUserIdx + 1);
    setMessages(trimmed);
    const text = trimmed[lastUserIdx].content;
    send(text, { regenerate: true, snapshot: trimmed });
  }, [messages, streaming]);

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
            onRegenerate={regenerate}
            onAskFollowup={askFollowup}
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
          <PromptInputBox onSend={send} onStop={onStop} isLoading={streaming} />
        </div>
      </div>

      <PdfPanel citation={panelCitation} onClose={() => setPanelCitation(null)} />
    </div>
  );
}
