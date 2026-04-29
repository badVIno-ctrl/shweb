import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import { AuroraBackground } from '@/components/AuroraBackground';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' });
const jet = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Viora Smart Academy (VSA) — 3D-учитель профильной математики ЕГЭ',
  description:
    'Viora Smart Academy — онлайн-школа профильной математики ЕГЭ с 3D ИИ-учителем у виртуальной доски.',
  metadataBase: new URL('https://viora.academy'),
  applicationName: 'Viora Smart Academy',
  authors: [{ name: 'Viora Smart Academy' }],
  keywords: [
    'ЕГЭ математика',
    'профильная математика',
    'онлайн-школа',
    '3D-учитель',
    'ИИ-репетитор',
    'Viora Smart Academy',
    'VSA',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Viora Smart Academy',
    title: 'Viora Smart Academy — 3D-учитель профильной математики ЕГЭ',
    description:
      'Теория по 19 заданиям профиля, бесконечная практика от ИИ и живой 3D-преподаватель у виртуальной доски.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viora Smart Academy',
    description: '3D-учитель профильной математики ЕГЭ.',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      className={`${inter.variable} ${jet.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-deep font-sans text-text-primary antialiased" suppressHydrationWarning>
        <AuroraBackground />
        {children}
      </body>
    </html>
  );
}
