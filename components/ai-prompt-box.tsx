'use client';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ArrowUp, Square } from 'lucide-react';
import React from 'react';

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// Embedded scrollbar styles for the dark textarea
const styles = `
  .prompt-box-textarea::-webkit-scrollbar { width: 6px; }
  .prompt-box-textarea::-webkit-scrollbar-track { background: transparent; }
  .prompt-box-textarea::-webkit-scrollbar-thumb { background-color: #3a3a3a; border-radius: 3px; }
  .prompt-box-textarea::-webkit-scrollbar-thumb:hover { background-color: #4a4a4a; }
`;

function useStyleInjection() {
  React.useEffect(() => {
    const styleId = 'ai-prompt-box-styles';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }
  }, []);
}

// Tooltip wrappers (Radix)
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
      'z-50 overflow-hidden rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-200 shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

// ———————————————————————————————————————————————————————————————
// PromptInputBox — a focused, monochrome composer. The dark pill
// floats on the light page for premium contrast; send button flips
// between a muted resting state and a solid-white active state.
// ———————————————————————————————————————————————————————————————

export interface PromptInputBoxProps {
  onSend?: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  function PromptInputBox(
    {
      onSend = () => {},
      isLoading = false,
      placeholder = 'Ask the corpus a question\u2026',
      className,
      disabled = false,
    },
    forwardedRef,
  ) {
    useStyleInjection();
    const [value, setValue] = React.useState('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Auto-resize on every value change.
    // biome-ignore lint/correctness/useExhaustiveDependencies: resize when value changes
    React.useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const next = Math.min(el.scrollHeight, 220);
      el.style.height = `${next}px`;
    }, [value]);

    const submit = () => {
      const v = value.trim();
      if (!v || disabled || isLoading) return;
      setValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onSend(v);
    };

    const hasContent = value.trim() !== '';
    const isDisabled = disabled || isLoading;

    return (
      <TooltipProvider delayDuration={120}>
        <div
          ref={forwardedRef}
          className={cn(
            'group relative rounded-[22px] border border-[#2a2a2a] bg-[#121212] shadow-[0_14px_40px_-18px_rgba(0,0,0,0.55)] transition-all duration-300',
            'focus-within:border-neutral-400 focus-within:shadow-[0_18px_56px_-20px_rgba(0,0,0,0.65)]',
            isDisabled && 'opacity-80',
            className,
          )}
        >
          <div className="flex items-start gap-3 px-5 pt-4">
            <span
              aria-hidden
              className="mt-[9px] shrink-0 font-mono text-[9px] uppercase tracking-[0.28em] text-neutral-500"
            >
              Ask
            </span>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={placeholder}
              disabled={isDisabled}
              className="prompt-box-textarea flex-1 resize-none border-none bg-transparent pb-3 text-[16px] leading-[1.5] text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
              style={{ minHeight: '24px', maxHeight: '220px' }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-5 pb-3.5">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-neutral-500">
                Enter to send
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-neutral-600">
                Shift + Enter for newline
              </span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!hasContent || isDisabled}
                  aria-label={isLoading ? 'Generating' : 'Send message'}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200',
                    hasContent && !isLoading
                      ? 'bg-white text-[#121212] hover:bg-neutral-200'
                      : isLoading
                        ? 'bg-neutral-300 text-[#121212]'
                        : 'bg-[#2a2a2a] text-neutral-500',
                    'disabled:pointer-events-none',
                  )}
                >
                  {isLoading ? (
                    <Square className="h-3.5 w-3.5 animate-pulse fill-[#121212]" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{isLoading ? 'Generating' : 'Send'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  },
);
