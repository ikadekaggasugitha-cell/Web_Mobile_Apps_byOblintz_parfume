'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/products', label: 'Koleksi' },
  { href: '/categories', label: 'Kategori' },
  { href: '/quiz', label: 'Quiz' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ivory/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo — left */}
        <Link
          href="/"
          className="font-serif text-2xl font-semibold tracking-[0.18em] text-espresso transition-opacity hover:opacity-70"
          aria-label="OBLINTZ — Beranda"
        >
          OBLINTZ
        </Link>

        {/* Primary nav — centered */}
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex"
          aria-label="Navigasi utama"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-warmgray transition-colors hover:text-espresso"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-primary-600 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Cart + auth — right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-espresso transition-colors hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            aria-label="Keranjang"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="hidden rounded-[10px] px-4 py-2 text-sm font-medium text-espresso transition-colors hover:bg-sand md:inline-block"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="hidden rounded-[10px] bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 md:inline-block"
          >
            Daftar
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-espresso transition-colors hover:bg-sand md:hidden"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-line bg-ivory px-4 py-5 md:hidden"
          aria-label="Navigasi mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-espresso transition-colors hover:bg-sand"
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-3 border-line" />
            <Link
              href="/login"
              onClick={closeMenu}
              className="rounded-[10px] border border-line px-3 py-2.5 text-center text-sm font-medium text-espresso transition-colors hover:bg-sand"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              onClick={closeMenu}
              className="rounded-[10px] bg-primary-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              Daftar
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
