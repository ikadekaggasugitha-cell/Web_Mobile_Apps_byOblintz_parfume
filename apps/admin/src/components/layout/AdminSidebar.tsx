'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/orders', label: 'Orders', icon: '🛒' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/content', label: 'Content', icon: '📝' },
  { href: '/marketing', label: 'Marketing', icon: '🎯' },
  { href: '/reports', label: 'Reports', icon: '📈' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white shadow-sm">
      <div className="border-b p-6">
        <Link href="/" className="text-xl font-bold text-primary-600">
          OBLINTZ Admin
        </Link>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100',
                  pathname === item.href && 'bg-primary-50 text-primary-600'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
