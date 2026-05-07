import { generateText } from 'ai';
import { getHelperModel } from '@/lib/llm/model';

/**
 * LLM-driven intent classifier. Runs BEFORE retrieval on every chat
 * turn.
 *
 * CRITICAL DESIGN NOTE — why this is a classifier, not a generator.
 * -----------------------------------------------------------------
 * An earlier version of this router let the LLM GENERATE the
 * conversational reply itself ("Sure, happy to help. What would you
 * like to dig into?"). That path bypassed all three strict-grounding
 * safeguards: the system prompt, the retrieval threshold gate, and
 * the citation verifier. A user prompt like "hey, quickly what's
 * PBL?" could be classified as greeting and answered from the base
 * model's parametric knowledge, shipping an ungrounded factual
 * claim under an otherwise trustworthy surface.
 *
 * To close that hole: the LLM now ONLY classifies the intent into
 * one of a small, fixed set of categories. It does not generate any
 * user-visible text. The reply is looked up from a curated table
 * below — so factual language cannot leak via this path no matter
 * how the classifier is prompted or spoofed.
 *
 * On any network / parse failure the router defaults to `research`
 * so the strict RAG pipeline handles the message (and the
 * downstream soft-refusal kicks in if retrieval misses).
 */

export type IntentResult = { kind: 'research' } | { kind: 'conversational'; reply: string };

type ConvIntent = 'greeting' | 'thanks' | 'farewell' | 'meta' | 'emotional' | 'other';

const CLASSIFIER_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('intent-classifier-timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

// All conversational categories emit a curated reply. The LLM never
// authors user-visible text in this path. Keep these short, warm,
// and scrupulously free of any factual claim — no numbers, no
// author names, no theory names.
const CANNED_REPLIES: Record<ConvIntent, string> = {
  greeting: 'Hey — good to see you. Want to pull something from the corpus today?',
  thanks: "Anytime. Tell me what you'd like to dig into next.",
  farewell: 'Take care. Your chat history is saved — come back whenever.',
  meta: "I'm Sir Sohail Agent — a research assistant for Prof. Sohail's closed library of peer-reviewed papers on innovation education and entrepreneurship pedagogy. Every answer comes with page-level citations from the library. Ask me about something in it.",
  emotional:
    "Sorry to hear that. I'm here if a paper would be a quiet distraction — otherwise take care of yourself first.",
  other:
    "Happy to chat briefly, but I'm built for one thing: answering from Prof. Sohail's library with citations. Want to try a research question?",
};

/**
 * Skip the LLM for unambiguous single-line conversational openers so the first
 * stream byte isn't blocked on Gemini (timeouts / regional cold starts bite
 * hardest on greetings like "hey").
 * Whole-message patterns only — "hey what is PBL" still goes to research.
 */
function conversationalFastPath(latest: string): IntentResult | null {
  const s = latest.trim().replace(/\s+/g, ' ');
  if (!s) return null;

  if (/^(hey|hi|hello|yo)( there)?[!.]?$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.greeting };
  }
  if (/^(good (morning|afternoon|evening)|gm|gn)[!.]?$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.greeting };
  }
  if (/^(what'?s up|sup)\??$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.greeting };
  }
  if (/^(thanks?|thank you|thx|cheers)[!.]?$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.thanks };
  }
  if (/^(bye|goodbye|see you|cya|later|i'?m out)[!.]?$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.farewell };
  }
  if (/^(who are you|what can you do|how do you work)(\?|\.)?$/i.test(s)) {
    return { kind: 'conversational', reply: CANNED_REPLIES.meta };
  }
  return null;
}

const TAGS = {
  research: '[[RESEARCH]]',
  greeting: '[[GREETING]]',
  thanks: '[[THANKS]]',
  farewell: '[[FAREWELL]]',
  meta: '[[META]]',
  emotional: '[[EMOTIONAL]]',
  other: '[[OTHER]]',
} as const;

const TAG_TO_INTENT: Record<string, 'research' | ConvIntent> = {
  [TAGS.research]: 'research',
  [TAGS.greeting]: 'greeting',
  [TAGS.thanks]: 'thanks',
  [TAGS.farewell]: 'farewell',
  [TAGS.meta]: 'meta',
  [TAGS.emotional]: 'emotional',
  [TAGS.other]: 'other',
};

const INTENT_SYSTEM_PROMPT = `You are the front-door classifier for Sir Sohail Agent, a research assistant strictly grounded in Prof. Sohail's closed corpus of peer-reviewed academic papers on innovation education and entrepreneurship pedagogy at Eastern Michigan University.

Your job: read the user's latest message and decide which category it falls into. Output EXACTLY ONE of these tokens and NOTHING else — no prose, no punctuation around it, no explanation:

${TAGS.research}   — user wants facts, summaries, comparisons, definitions, or quotes from the corpus
${TAGS.greeting}   — hello / hi / hey / good morning / "what's up"
${TAGS.thanks}     — "thanks" / "thank you" / "appreciate it"
${TAGS.farewell}   — "bye" / "goodbye" / "see you" / "later" / "I'm out"
${TAGS.meta}       — "who are you" / "what can you do" / "how do you work"
${TAGS.emotional}  — user is sharing a feeling or life update ("I'm tired", "my day was rough")
${TAGS.other}      — anything conversational that doesn't fit the categories above (e.g. "I love you", "tell me a joke")

RULES
1. Factual or research questions ALWAYS get ${TAGS.research}. Even if they sound casual ("what's PBL, btw?"), if they ask for any fact, they are research.
2. Do NOT answer the question. Do NOT greet the user. Do NOT apologize. Do NOT explain. Output ONLY the token.
3. If uncertain, default to ${TAGS.research}.

EXAMPLES

User: hey → ${TAGS.greeting}
User: thanks so much → ${TAGS.thanks}
User: bye for now → ${TAGS.farewell}
User: who are you? → ${TAGS.meta}
User: my day was bad → ${TAGS.emotional}
User: I love you → ${TAGS.other}
User: what is project-based learning → ${TAGS.research}
User: compare design thinking and resilience in the papers → ${TAGS.research}
User: quickly, what's PBL btw → ${TAGS.research}
User: tell me about innovation in med schools → ${TAGS.research}
`;

const RESEARCH_MARKER = TAGS.research;

export async function routeIntent({
  history,
  latest,
}: {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  latest: string;
}): Promise<IntentResult> {
  try {
    // Strip any literal tag tokens from user-authored text so the
    // classifier can't be spoofed by a prompt containing `[[RESEARCH]]`
    // or `[[GREETING]]` verbatim.
    const strip = (s: string) => {
      let out = s;
      for (const tag of Object.values(TAGS)) out = out.replaceAll(tag, '');
      return out;
    };

    const sanitizedLatest = strip(latest);

    const immediate = conversationalFastPath(sanitizedLatest);
    if (immediate) return immediate;

    const { text } = await withTimeout(
      generateText({
        model: getHelperModel(),
        system: INTENT_SYSTEM_PROMPT,
        messages: [
          ...history.slice(-4).map((m) => ({
            role: m.role,
            content: strip(m.content),
          })),
          { role: 'user' as const, content: sanitizedLatest },
        ],
        // Classifier output is a single token, ~14 chars. Keep the cap
        // tight — stops a runaway LLM from drifting into an answer.
        // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
        ...({ maxOutputTokens: 24 } as any),
      }),
      CLASSIFIER_TIMEOUT_MS,
    );

    const trimmed = text.trim().toUpperCase();

    // Find the first recognised tag in the (usually single-token) output.
    let matched: 'research' | ConvIntent | undefined;
    for (const [tag, intent] of Object.entries(TAG_TO_INTENT)) {
      if (trimmed.includes(tag)) {
        matched = intent;
        break;
      }
    }

    if (!matched || matched === 'research') {
      return { kind: 'research' };
    }

    return { kind: 'conversational', reply: CANNED_REPLIES[matched] };
  } catch {
    // Classifier failure → strict RAG path. The soft-refusal downstream
    // handles the case where retrieval finds nothing relevant.
    return { kind: 'research' };
  }
}

// Kept exported for any external test that used the old marker. Not
// referenced by the route — it's here only for backwards compat.
export { RESEARCH_MARKER };
