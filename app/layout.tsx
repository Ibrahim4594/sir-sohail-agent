import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

/**
 * Display face — Fraunces (variable). Used for all big editorial headlines
 * and the italic accents that give the site its voice.
 */
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

/**
 * Body + UI face — Instrument Sans. Distinctive humanist sans;
 * deliberately not Inter / Roboto / system-ui.
 */
const instrumentSans = Instrument_Sans({
  variable: '--font-instrument-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

/**
 * Monospace face — JetBrains Mono. Used only for the small-caps metadata
 * labels that form the micro-typographic spine of the design.
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
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
