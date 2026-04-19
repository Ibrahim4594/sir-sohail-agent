/**
 * Strip the most common markdown glyphs from a string so it reads
 * naturally through text-to-speech. Not a full parser — just enough
 * to avoid the voice pronouncing "asterisk asterisk" around bold
 * words or "hash hash" at the start of headings. Also strips the
 * inline citation markers [1], [2], ... that Ibid injects; those
 * would otherwise be read as "open bracket one close bracket."
 */
export function markdownToPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[\d+\]/g, '') // Ibid citation markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/_([^_]+)_/g, '$1') // italic alt
    .replace(/~~([^~]+)~~/g, '$1') // strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → label only
    .replace(/^#+\s*/gm, '') // ATX headers
    .replace(/^>\s*/gm, '') // blockquote markers
    .replace(/^[-*]\s+/gm, '') // bullet markers
    .replace(/^\d+\.\s+/gm, '') // numbered-list markers
    .replace(/\n{3,}/g, '\n\n') // collapse extra blank lines
    .replace(/\s{2,}/g, ' ') // collapse runs of spaces
    .trim();
}
