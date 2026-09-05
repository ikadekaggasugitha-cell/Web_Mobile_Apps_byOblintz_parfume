'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  Newspaper,
  HelpCircle,
  Tag,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Umum',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Katalog',
    items: [
      { href: '/products', label: 'Produk', icon: Package },
      { href: '/stock', label: 'Rekap Stok', icon: ClipboardList },
      { href: '/promos', label: 'Promo', icon: Tag },
    ],
  },
  {
    title: 'Penjualan',
    items: [
      { href: '/orders', label: 'Pesanan', icon: ShoppingCart },
      { href: '/users', label: 'Pengguna', icon: Users },
      { href: '/reports', label: 'Laporan', icon: BarChart3 },
    ],
  },
  {
    title: 'Konten',
    items: [
      { href: '/content/banners', label: 'Banner', icon: ImageIcon },
      { href: '/content/articles', label: 'Artikel', icon: Newspaper },
      { href: '/content/faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
  {
    title: 'Sistem',
    items: [{ href: '/settings', label: 'Pengaturan', icon: Settings }],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            O
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-slate-900">
              OBLINTZ
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Admin CMS
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                          active
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-600" />
                        )}
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0 transition-colors',
                            active
                              ? 'text-primary-600'
                              : 'text-slate-400 group-hover:text-slate-600'
                          )}
                          strokeWidth={2}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-3">
          <p className="text-[11px] text-slate-400">
            OBLINTZ Admin &middot; v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
