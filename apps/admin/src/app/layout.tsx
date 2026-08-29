import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';

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
        <div className="flex min-h-screen bg-gray-100">
          <AdminSidebar />
          <div className="flex-1">
            <AdminHeader />
            <main id="main-content" className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
