import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

/**
 * Hanken Grotesk — our one premium sans. Variable weight + italic.
 * Used for both display and body — one-font system, ChatGPT-style.
 * Free on Google Fonts, but distinctive enough to read as premium.
 */
const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

/**
 * JetBrains Mono — tiny uppercase metadata labels that form the
 * micro-typographic spine of the design. One of the few places
 * monospace feels intentional rather than stylistic.
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
    <html lang="en" className={`${hanken.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
