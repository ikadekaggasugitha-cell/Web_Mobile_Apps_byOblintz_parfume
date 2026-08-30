import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Split-screen boutique auth experience: an editorial burgundy brand panel on
 * the left (a condensed top band on mobile) and a calm, highly-readable ivory
 * form panel on the right. Rendered chrome-less via SiteShell's bare routes.
 */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      {/* ── Brand panel ────────────────────────────────────────────────── */}
      <aside className="relative flex min-h-[34vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-8 py-8 text-ivory sm:px-10 lg:min-h-screen lg:px-14 lg:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(198,161,91,0.28),transparent_62%)]" />
          <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(152,87,97,0.4),transparent_60%)]" />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-2xl font-semibold tracking-[0.18em] text-ivory transition-opacity hover:opacity-80"
          >
            OBLINTZ
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-luxe text-ivory/70 transition-colors hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Beranda
          </Link>
        </div>

        {/* Editorial quote — full expression on lg, hidden on compact mobile band */}
        <div className="relative hidden lg:block">
          <span aria-hidden="true" className="text-3xl text-gold-400/70">✦</span>
          <blockquote className="mt-6 max-w-md font-serif text-3xl font-medium italic leading-tight text-ivory/95">
            “Setiap aroma adalah kenangan yang menunggu untuk dikisahkan.”
          </blockquote>
          <p className="mt-5 text-xs uppercase tracking-luxe text-gold-300">
            Temukan aroma yang menuturkan kisah Anda
          </p>
        </div>

        <p className="relative text-xs uppercase tracking-luxe text-gold-300/80">
          Maison de Parfum · Est. 2026
        </p>
      </aside>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-ivory px-6 py-12 sm:px-10 lg:py-16">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-3xl font-medium leading-tight tracking-[-0.01em] text-espresso sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-warmgray">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
