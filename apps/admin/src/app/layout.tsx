import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminShell } from '@/components/layout/AdminShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OBLINTZ Admin - CMS Dashboard',
  description: 'Admin panel for OBLINTZ E-Commerce',
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
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
