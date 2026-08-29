'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-primary-600">
          OBLINTZ
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
          <Link href="/products" className="text-gray-600 hover:text-primary-600">
            Produk
          </Link>
          <Link href="/categories" className="text-gray-600 hover:text-primary-600">
            Kategori
          </Link>
          <Link href="/quiz" className="text-gray-600 hover:text-primary-600">
            Quiz
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="text-gray-600 hover:text-primary-600" aria-label="Keranjang">
            🛒
          </Link>
          <Link
            href="/login"
            className="hidden rounded-lg border border-primary-600 px-4 py-2 text-primary-600 hover:bg-primary-50 md:inline-block"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="hidden rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 md:inline-block"
          >
            Daftar
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-gray-100 bg-white px-4 py-4 md:hidden"
          aria-label="Navigasi mobile"
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/products"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              Produk
            </Link>
            <Link
              href="/categories"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              Kategori
            </Link>
            <Link
              href="/quiz"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              Quiz
            </Link>
            <hr className="border-gray-200" />
            <Link
              href="/login"
              onClick={closeMenu}
              className="rounded-lg border border-primary-600 px-3 py-2 text-center text-primary-600 hover:bg-primary-50"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              onClick={closeMenu}
              className="rounded-lg bg-primary-600 px-3 py-2 text-center text-white hover:bg-primary-700"
            >
              Daftar
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
