'use client';
import { toast } from 'sonner';
import { FeedbackWidget } from '@/components/ui/feedback-widget';

/**
 * Inline feedback form on the settings page. Previously lived in a
 * dialog fired from the account menu; it belongs here in the settings
 * surface area so users can take their time writing it.
 */
export function FeedbackCard() {
  return (
    <div className="py-2">
      <FeedbackWidget
        className="!p-0"
        label="Was Ibid helpful?"
        placeholder="What worked, what didn't, and what's missing? Prof. Sohail reads every note."
        onSubmit={async ({ rating, feedback }) => {
          // Dev-only logging until a persistence endpoint exists. The
          // rating is captured alongside the free-form text; the
          // schema mirrors what a future /api/feedback endpoint would
          // receive.
          if (typeof window !== 'undefined') {
            window.console?.log?.('feedback', { rating, feedback });
          }
          toast.success('Thanks — feedback recorded.');
        }}
      />
    </div>
  );
}
