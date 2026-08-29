import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OBLINTZ - Premium Perfume E-Commerce',
  description: 'Temukan parfum premium favorit Anda di OBLINTZ. Koleksi parfum original dengan harga terbaik.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com'),
  openGraph: {
    title: 'OBLINTZ - Premium Perfume E-Commerce',
    description: 'Temukan parfum premium favorit Anda di OBLINTZ. Koleksi parfum original dengan harga terbaik.',
    siteName: 'OBLINTZ',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OBLINTZ - Premium Perfume E-Commerce',
    description: 'Temukan parfum premium favorit Anda di OBLINTZ. Koleksi parfum original dengan harga terbaik.',
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
    <html lang="id">
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-primary-600 focus:shadow-lg">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
