export type ChunkOpts = {
  targetChars: number;
  overlapChars: number;
};

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export function chunkPage(text: string, opts: ChunkOpts): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  if (cleaned.length <= opts.targetChars) return [cleaned];

  const sentences = cleaned.split(SENTENCE_SPLIT);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (`${current} ${s}`.trim().length <= opts.targetChars) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) chunks.push(current.trim());
      const tail = current.slice(-opts.overlapChars).trim();
      current = tail ? `${tail} ${s}` : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const output: string[] = [];
  for (const c of chunks) {
    if (c.length <= opts.targetChars + opts.overlapChars) {
      output.push(c);
      continue;
    }
    for (let i = 0; i < c.length; i += opts.targetChars - opts.overlapChars) {
      output.push(c.slice(i, i + opts.targetChars));
    }
  }
  return output;
}
