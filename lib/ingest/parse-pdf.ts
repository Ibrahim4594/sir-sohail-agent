export type ParsedPdf = {
  pageCount: number;
  pages: string[];
};

export async function parsePdf(data: Uint8Array): Promise<ParsedPdf> {
  // Node 22 does not ship Promise.try; some transitive PDF tooling still expects it.
  const promiseWithTry = Promise as PromiseConstructor & {
    try?: <T, U extends unknown[]>(
      callbackFn: (...args: U) => T | PromiseLike<T>,
      ...args: U
    ) => Promise<Awaited<T>>;
  };
  if (typeof promiseWithTry.try !== 'function') {
    promiseWithTry.try = function promiseTry(fn, ...args) {
      return new Promise<Awaited<ReturnType<typeof fn>>>((resolve, reject) => {
        Promise.resolve(fn(...args)).then(
          (value) => resolve(value as Awaited<ReturnType<typeof fn>>),
          reject,
        );
      }) as Promise<Awaited<ReturnType<typeof fn>>>;
    };
  }

  const { extractText } = await import('unpdf');
  const { totalPages, text } = await extractText(data, { mergePages: false });
  const pages = Array.isArray(text) ? text.map((t) => t || '') : [String(text ?? '')];
  return { pageCount: totalPages, pages };
}
