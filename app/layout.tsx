import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

/**
 * Hanken Grotesk — one font, everything.
 *
 * Closest free Google Fonts equivalent to Söhne Regular (which ChatGPT
 * uses; Söhne is Klim Type Foundry, proprietary + paid). Same
 * neo-grotesque proportions, same premium feel. Variable weight 300-900
 * with proper italic. Used for display headlines, body copy, UI
 * labels, and italic accents alike.
 */
const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Ibid — cited, not guessed.',
    template: '%s — Ibid',
  },
  description:
    'Ibid is a research assistant bound to a closed corpus of peer-reviewed papers. Every claim is footnoted; every footnote opens the exact page of the source. A Sir Sohail project at Eastern Michigan University.',
  applicationName: 'Ibid',
  authors: [{ name: 'Eastern Michigan University' }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

/**
 * FOUC-prevention script. Runs in <head> before React hydrates so the
 * correct theme class is already on <html> when the first paint
 * happens. Without this you'd briefly see the light theme while the
 * useTheme effect mounts, then snap to dark — the classic dark-mode
 * flash. Mirrors the logic in lib/use-theme.ts.
 */
const THEME_INIT_SCRIPT = `
(function(){try{
  var t = localStorage.getItem('theme');
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme init must run before hydration */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip-to-content — a11y bypass block for keyboard + SR users. */}
        <a
          href="#main"
          className="sr-only fixed left-3 top-3 z-[60] inline-flex items-center rounded-md border border-foreground bg-background px-3 py-1.5 text-[12px] font-[500] text-foreground shadow-sm focus:not-sr-only focus-visible:outline-none"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
