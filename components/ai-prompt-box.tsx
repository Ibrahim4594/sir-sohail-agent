'use client';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ArrowUp, Mic, Square, StopCircle } from 'lucide-react';
import React from 'react';

// ———————————————————————————————————————————————————————————————
// PromptInputBox — monochrome composer with real Web Speech API
// voice input. Based on easemize/ai-prompt-box (21st.dev) but
// stripped of features that don't apply to a corpus-grounded chat
// (Search/Think/Canvas modes, image upload) and retheme'd from
// the source's dark palette to the project's white/black tokens.
// ———————————————————————————————————————————————————————————————

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Scrollbar styles for the composer textarea.
const STYLES = `
  .prompt-ta::-webkit-scrollbar { width: 6px; }
  .prompt-ta::-webkit-scrollbar-track { background: transparent; }
  .prompt-ta::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.15); border-radius: 3px; }
  .prompt-ta::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.25); }
`;

function useInjectStyles() {
  React.useEffect(() => {
    const id = 'ai-prompt-box-styles';
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.innerText = STYLES;
    document.head.appendChild(el);
  }, []);
}

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-foreground/15 bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

// Static visualiser bar heights so the waveform doesn't re-shuffle
// on every render but still feels organic.
const BAR_HEIGHTS = Array.from({ length: 28 }, (_, i) => {
  const base = 20 + ((i * 37) % 70);
  return Math.max(18, Math.min(100, base));
});

function VoiceRecorder({ isRecording }: { isRecording: boolean }) {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!isRecording) {
      setSeconds(0);
      return;
    }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center py-4 transition-all duration-300',
        isRecording ? 'opacity-100' : 'h-0 opacity-0',
      )}
      aria-live="polite"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-foreground" aria-hidden />
        <span className="font-mono text-[12px] tracking-[0.12em] text-foreground">
          {mm}:{ss}
        </span>
      </div>
      <div className="flex h-10 w-full items-center justify-center gap-[3px] px-4">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static visualiser pattern
            key={i}
            aria-hidden
            className="w-[2px] animate-pulse rounded-full bg-foreground/70"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.06}s`,
              animationDuration: `${0.55 + (i % 5) * 0.08}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export interface PromptInputBoxProps {
  onSend?: (message: string) => void;
  /** Called when the user clicks stop while isLoading. Aborts the
      in-flight stream in the parent. If omitted, the stop button is
      disabled — preserving the old behaviour for any consumer that
      hasn't opted in yet. */
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Narrow window type for Web Speech API — not part of lib.dom.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  function PromptInputBox(
    {
      onSend = () => {},
      onStop,
      isLoading = false,
      placeholder = 'Ask the corpus a question\u2026',
      className,
      disabled = false,
    },
    forwardedRef,
  ) {
    useInjectStyles();

    const [value, setValue] = React.useState('');
    const [isRecording, setIsRecording] = React.useState(false);
    const [voiceNotSupported, setVoiceNotSupported] = React.useState(false);

    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
    // Persists finalised (non-interim) transcript across `onresult` calls.
    const finalTranscriptRef = React.useRef('');

    // Auto-resize textarea to content up to 220px.
    // biome-ignore lint/correctness/useExhaustiveDependencies: resize when value changes
    React.useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const next = Math.min(el.scrollHeight, 220);
      el.style.height = `${next}px`;
    }, [value]);

    // Clean up any live recognition on unmount.
    React.useEffect(() => {
      return () => {
        recognitionRef.current?.stop();
      };
    }, []);

    // P1.7 — Autofocus the composer on initial mount so a returning
    // user can start typing immediately. Skipped if we mount into a
    // loading state (rare, only if the page reload hits mid-stream).
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount only
    React.useEffect(() => {
      if (!isLoading) textareaRef.current?.focus();
    }, []);

    // P1.6 — Re-focus the composer when the model finishes its turn.
    // A loading→idle transition is the signal the user can type
    // again; without this they have to click the composer every time.
    const prevLoadingRef = React.useRef(isLoading);
    React.useEffect(() => {
      if (prevLoadingRef.current && !isLoading) {
        textareaRef.current?.focus();
      }
      prevLoadingRef.current = isLoading;
    }, [isLoading]);

    const submit = () => {
      const v = value.trim();
      if (!v || disabled || isLoading) return;
      // Always stop the mic before handing off. If the user pressed
      // Enter or the send button mid-recording, the transcript has
      // already landed in `value` via `onresult` — keeping the
      // recogniser running would leave "Listening…" pinned under a
      // message that's already in flight.
      if (isRecording) stopVoice();
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onSend(v);
    };

    const startVoice = () => {
      if (typeof window === 'undefined') return;
      // biome-ignore lint/suspicious/noExplicitAny: SpeechRecognition isn't in lib.dom
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setVoiceNotSupported(true);
        setTimeout(() => setVoiceNotSupported(false), 2800);
        return;
      }
      const rec: SpeechRecognitionLike = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

      finalTranscriptRef.current = value ? `${value.trim()} ` : '';

      rec.onresult = (e) => {
        let finalAdd = '';
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = r[0].transcript;
          if (r.isFinal) finalAdd += t;
          else interim += t;
        }
        if (finalAdd) finalTranscriptRef.current += finalAdd;
        const combined = (finalTranscriptRef.current + interim).replace(/\s+/g, ' ').trim();
        setValue(combined);
      };
      rec.onerror = () => {
        setIsRecording(false);
      };
      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      try {
        rec.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    };

    const stopVoice = () => {
      recognitionRef.current?.stop();
      setIsRecording(false);
    };

    const toggleVoice = () => {
      if (isRecording) stopVoice();
      else startVoice();
    };

    const hasContent = value.trim() !== '';
    const isDisabled = disabled || isLoading;

    return (
      <TooltipProvider delayDuration={120}>
        <div
          ref={forwardedRef}
          className={cn(
            'group relative rounded-[22px] border border-foreground/15 bg-background shadow-[0_14px_40px_-20px_rgba(0,0,0,0.18)] transition-all duration-300',
            'focus-within:border-foreground/35 focus-within:shadow-[0_18px_56px_-22px_rgba(0,0,0,0.22)]',
            isRecording && 'border-foreground/60',
            isDisabled && 'opacity-80',
            className,
          )}
        >
          {/* Input area — collapses when recording */}
          <div
            className={cn(
              'transition-all duration-300',
              isRecording ? 'h-0 overflow-hidden opacity-0' : 'opacity-100',
            )}
          >
            <div className="flex items-start gap-3 px-5 pt-4">
              <span
                aria-hidden
                className="mt-[9px] shrink-0 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground"
              >
                Ask
              </span>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  // IME guard: during Chinese/Japanese/Korean
                  // composition, Enter commits the composition and is
                  // NOT a submit intent. `isComposing` is false once
                  // the composition is finalised, so a subsequent
                  // Enter correctly fires submit.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder={placeholder}
                disabled={isDisabled}
                className="prompt-ta flex-1 resize-none border-none bg-transparent pb-3 text-[16px] leading-[1.5] text-foreground placeholder:text-muted-foreground focus:outline-none"
                style={{ minHeight: '24px', maxHeight: '220px' }}
              />
            </div>
          </div>

          {/* Voice waveform */}
          {isRecording && <VoiceRecorder isRecording={isRecording} />}

          <div className="flex items-center justify-between gap-3 px-5 pb-3.5">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                {isRecording
                  ? 'Listening\u2026'
                  : voiceNotSupported
                    ? 'Voice unsupported in this browser'
                    : 'Enter to send'}
              </span>
              {!isRecording && !voiceNotSupported && (
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/70 sm:inline">
                  Shift + Enter for newline
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleVoice}
                    disabled={isDisabled}
                    aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isRecording}
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                      isRecording
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'border border-foreground/20 bg-background text-foreground hover:bg-muted',
                      'disabled:pointer-events-none disabled:opacity-50',
                    )}
                  >
                    {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{isRecording ? 'Stop' : 'Voice'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* The same button now serves two roles. While
                      isLoading and onStop is provided, it ABORTS the
                      in-flight stream. Otherwise it SENDS the
                      composed text. Disabled only when idle-and-empty
                      or the whole box is disabled — never disabled
                      mid-stream, so the user always has an exit. */}
                  <button
                    type="button"
                    onClick={isLoading ? onStop : submit}
                    disabled={isLoading ? !onStop || disabled : !hasContent || disabled}
                    aria-label={isLoading ? 'Stop generating' : 'Send message'}
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                      isLoading
                        ? 'bg-foreground text-background hover:bg-foreground/85'
                        : hasContent
                          ? 'bg-foreground text-background hover:bg-foreground/85'
                          : 'bg-muted text-muted-foreground',
                      'disabled:pointer-events-none disabled:opacity-60',
                    )}
                  >
                    {isLoading ? (
                      <Square className="h-3 w-3 fill-background" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{isLoading ? 'Stop' : 'Send'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  },
);
