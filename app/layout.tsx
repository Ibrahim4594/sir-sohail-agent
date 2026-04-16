import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

/**
 * Instrument Sans — Instrument Foundry's premium neo-grotesque. Used
 * for display and body alike. Variable weight 400–700, proper italic.
 * Chosen over Onest for more character without losing the "clean" brief.
 */
const instrumentSans = Instrument_Sans({
  variable: '--font-instrument-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

/**
 * Instrument Serif — same foundry's companion serif. Used sparingly,
 * only for the italic emphasis word in hero headlines. This mirrors
 * Anthropic's Styrene+Tiempos pairing move at $0.
 */
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

/**
 * JetBrains Mono — small-caps metadata labels. The micro-typographic
 * spine; present on every page as the third voice.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "Sir Sohail's Research Assistant",
    template: "%s — Sir Sohail's",
  },
  description:
    'A chat agent bound to a closed corpus of peer-reviewed papers. Every claim is footnoted; every footnote opens the exact page of the source.',
  applicationName: "Sir Sohail's Research Assistant",
  authors: [{ name: 'Eastern Michigan University' }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
