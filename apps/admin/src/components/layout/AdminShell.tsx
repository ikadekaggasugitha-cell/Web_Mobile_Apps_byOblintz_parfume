'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';

// Routes that render without the admin chrome and without an auth guard.
const BARE_ROUTES = ['/login'];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isBare = BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Auth guard for protected (non-bare) routes: block rendering until we've
  // confirmed an admin token exists, redirecting to /login when it doesn't.
  const [authState, setAuthState] = useState<'checking' | 'authed'>('checking');

  useEffect(() => {
    if (isBare) return;

    const token = localStorage.getItem('adminAccessToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    setAuthState('authed');
  }, [isBare, pathname, router]);

  // Focused, chrome-less flows (login) render full-bleed.
  if (isBare) {
    return <main id="main-content">{children}</main>;
  }

  // While verifying — or when unauthenticated and about to be redirected —
  // never paint protected content.
  if (authState !== 'authed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500"
          role="status"
          aria-label="Memuat"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
