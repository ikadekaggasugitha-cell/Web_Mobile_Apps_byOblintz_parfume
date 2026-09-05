'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ExternalLink } from 'lucide-react';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

const TITLES: Array<{ match: string; label: string }> = [
  { match: '/dashboard', label: 'Dashboard' },
  { match: '/products', label: 'Produk' },
  { match: '/stock', label: 'Rekap Stok' },
  { match: '/promos', label: 'Promo' },
  { match: '/orders', label: 'Pesanan' },
  { match: '/users', label: 'Pengguna' },
  { match: '/reports', label: 'Laporan' },
  { match: '/subscriptions', label: 'Langganan' },
  { match: '/content/banners', label: 'Banner' },
  { match: '/content/articles', label: 'Artikel' },
  { match: '/content/faq', label: 'FAQ' },
  { match: '/settings', label: 'Pengaturan' },
];

function usePageTitle(pathname: string) {
  const hit = TITLES.filter((t) => pathname.startsWith(t.match)).sort(
    (a, b) => b.match.length - a.match.length
  )[0];
  return hit?.label ?? 'Admin';
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const title = usePageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} />
          Lihat Situs
        </Link>

        <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 ring-1 ring-inset ring-primary-200">
            A
          </div>
          <div className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium text-slate-900">Admin</span>
            <span className="block text-xs text-slate-500">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
