'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FeedbackWidget } from '@/components/ui/feedback-widget';

/**
 * Floating feedback widget pinned to the bottom-left of the chat area.
 * Users rate "was this helpful?" and optionally write feedback.
 * In v1 we log to console + toast; a persistence endpoint can be added later.
 */
export function ChatFeedback() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-30 flex h-10 w-10 items-center justify-center border border-foreground bg-background text-foreground shadow-[0_10px_28px_-12px_rgba(0,0,0,0.2)] transition hover:bg-foreground hover:text-background"
        aria-label={open ? 'Close feedback' : 'Give feedback'}
      >
        {/* Speech-bubble-with-check glyph, single stroke */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label="Feedback"
        >
          <title>Feedback</title>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9 10h6" />
          <path d="M9 14h3" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed bottom-20 left-6 z-30 w-[420px] max-w-[calc(100vw-3rem)]"
          >
            <FeedbackWidget
              className="!p-0"
              label="Was this helpful?"
              placeholder="Tell us what worked, what didn't, and what's missing..."
              onSubmit={async ({ rating, feedback }) => {
                // dev-only logging until a feedback endpoint exists
                if (typeof window !== 'undefined') {
                  window.console?.log?.('feedback', { rating, feedback });
                }
                toast.success('Thanks \u2014 feedback recorded.');
                setOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
