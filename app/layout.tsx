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
    <html lang="en" className={`${hanken.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
