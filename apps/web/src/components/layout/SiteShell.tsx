'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

// Routes that opt out of the global chrome for a focused, boutique experience.
const BARE_ROUTES = ['/login', '/register'];

/**
 * Wraps every page with the shared announcement bar, header and footer —
 * except focused flows (auth) which render full-bleed without chrome.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (bare) {
    return <main id="main-content">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
