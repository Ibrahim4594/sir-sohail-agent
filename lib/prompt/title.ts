import { generateText } from 'ai';
import { getHelperModel } from '@/lib/llm/model';

/**
 * Generates a short, human-readable conversation title for the
 * sidebar — like ChatGPT / Claude. The raw user question makes a
 * lousy title because it's almost always a full sentence, which
 * wraps or truncates into visual clutter. A good title is 3–6 words,
 * Title Case, and captures the TOPIC rather than the question form.
 *
 * The route runs this once after the first exchange settles. On any
 * failure the caller should fall back to the slice-based default so
 * a transient LLM error doesn't block the chat.
 */

const TITLE_SYSTEM_PROMPT = `You generate short conversation titles for Sir Sohail Agent, a research assistant that answers from a closed library of peer-reviewed papers on innovation education and entrepreneurship pedagogy.

Given one user message and the assistant's first reply, output a concise TITLE of 3 to 6 words that captures the topic.

RULES
- 3 to 6 words. Never more.
- Title Case (capitalise the main words, lowercase articles).
- No trailing punctuation. No quotes or brackets around it.
- No prefix like "Discussion of", "Question about", "Topic:".
- Focus on the subject matter, not the question form.
- If the exchange was a refusal, greeting, or thanks, output exactly: General Conversation
- Output ONLY the title. Nothing else.

EXAMPLES

User: what is project based learning according to the corpus
Assistant: Project-Based Learning is connected to models involving Design Thinking…
Title: Project-Based Learning Models

User: which papers discuss innovation in higher education?
Assistant: Several papers address this, notably Bell (2024) and Kuratko (2022)…
Title: Higher Education Innovation Papers

User: compare resilience and design thinking across the corpus
Assistant: Resilience frameworks and design-thinking pedagogy overlap in three ways…
Title: Resilience Versus Design Thinking

User: hey
Assistant: Hey — good to see you. Want to pull something from the corpus today?
Title: General Conversation

User: thanks
Assistant: Anytime. Tell me what you'd like to dig into next.
Title: General Conversation
`;

const MAX_TITLE_LEN = 60;

export async function generateConversationTitle(
  userText: string,
  assistantText: string,
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: getHelperModel(),
      system: TITLE_SYSTEM_PROMPT,
      prompt: `User: ${userText.slice(0, 500)}\nAssistant: ${assistantText.slice(0, 1500)}\nTitle:`,
      // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
      ...({ maxOutputTokens: 24 } as any),
    });
    // Strip anything the model wrapped around the bare title — leading
    // "Title:", quote marks, trailing punctuation, runs of whitespace.
    const cleaned = text
      .trim()
      .replace(/^\s*title\s*[:-]\s*/i, '')
      .replace(/^["'`]+|["'`.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_TITLE_LEN);
    if (!cleaned || cleaned.length < 2) return null;
    return cleaned;
  } catch {
    return null;
  }
}
