import { generateText } from 'ai';
import { getHelperModel } from '@/lib/llm/model';

/**
 * Generates three short, corpus-grounded follow-up questions a student
 * could ask next. Runs in parallel with the entailment check after the
 * main answer settles, so it adds no perceived latency over the
 * existing post-stream pause. Failures fall back silently to an empty
 * list — the UI just hides the row when there's nothing to show.
 *
 * The questions are conditioned on the same papers cited in the answer
 * so they stay plausibly answerable from the same retrieval set. We do
 * NOT promise the next retrieval will surface those exact chunks — we
 * just bias toward "questions a Bandura-citing answer might lead to,"
 * which is good enough for a discovery aid.
 */

const FOLLOWUP_SYSTEM_PROMPT = `You write short follow-up questions a student could ask next about Prof. Sohail's closed library of peer-reviewed papers on innovation education and entrepreneurship pedagogy.

RULES
- Output EXACTLY three follow-up questions, one per line.
- Each question must be plausibly answerable from the SAME papers cited in the previous answer.
- Probe deeper, compare two cited authors, ask for an example, or apply the idea — do not just rephrase the original question.
- Each question must be under 90 characters and read like a real student would type it.
- No numbering, no dashes, no quotes, no commentary, no preamble.
- If the previous answer was a refusal, output exactly: NONE
`;

export async function generateFollowUps({
  question,
  answer,
  titles,
}: {
  question: string;
  answer: string;
  titles: string[];
}): Promise<string[]> {
  if (!answer.trim() || titles.length === 0) return [];
  try {
    const { text } = await generateText({
      model: getHelperModel(),
      system: FOLLOWUP_SYSTEM_PROMPT,
      prompt: `PAPERS CITED: ${titles.join('; ')}\n\nUSER QUESTION: ${question.slice(0, 500)}\n\nASSISTANT ANSWER:\n${answer.slice(0, 2500)}\n\nThree follow-up questions:`,
      // biome-ignore lint/suspicious/noExplicitAny: maxOutputTokens varies by provider
      ...({ maxOutputTokens: 180 } as any),
    });
    if (/^\s*NONE\s*$/i.test(text)) return [];
    const lines = text
      .split('\n')
      .map((s) => s.trim())
      // Strip leading numbering or bullet glyphs the model might add
      // even when told not to ("1. …", "- …", "• …", "Q1: …").
      .map((s) => s.replace(/^(?:[-•*]|\d+[.)]|q\d+[:.])\s*/i, ''))
      .map((s) => s.replace(/^["'`]+|["'`]+$/g, ''))
      .filter((s) => s.length > 0 && s.length < 200);
    return lines.slice(0, 3);
  } catch {
    return [];
  }
}
