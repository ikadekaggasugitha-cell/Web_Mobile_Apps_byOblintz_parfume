import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { SiteShell } from '@/components/layout/SiteShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Fraunces — a high-contrast, slightly flared "heritage" serif that carries the
// editorial display voice across the whole site. Variable weight + true italic.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const SITE_NAME = 'OBLINTZ';
const DEFAULT_TITLE = 'OBLINTZ — Parfum Original Premium & Parfum Import';
const DEFAULT_DESCRIPTION =
  'Belanja parfum original premium di OBLINTZ. Koleksi parfum pria, wanita, dan unisex pilihan dengan jaminan keaslian, gift wrapping, dan pengiriman cepat ke seluruh Indonesia.';

export const metadata: Metadata = {
  // `%s` is replaced by each page's own title; pages that need a standalone
  // title use `title: { absolute: '...' }`.
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'parfum original',
    'parfum premium',
    'parfum import',
    'parfum pria',
    'parfum wanita',
    'parfum unisex',
    'jual parfum',
    'OBLINTZ',
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com'),
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-primary-600 focus:shadow-lg">
          Skip to content
        </a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
