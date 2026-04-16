import { extractText } from 'unpdf';

export type ParsedPdf = {
  pageCount: number;
  pages: string[];
};

export async function parsePdf(data: Uint8Array): Promise<ParsedPdf> {
  const { totalPages, text } = await extractText(data, { mergePages: false });
  const pages = Array.isArray(text) ? text.map((t) => t || '') : [String(text ?? '')];
  return { pageCount: totalPages, pages };
}
