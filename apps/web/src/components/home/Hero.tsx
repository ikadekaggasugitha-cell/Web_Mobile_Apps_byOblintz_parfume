import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      {/* Soft decorative glow — evokes fragrance diffusing through air */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-24 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-100/70 via-gold-100/40 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-96 w-96 rounded-full bg-gradient-to-tr from-gold-100/50 to-transparent blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 py-24 text-center sm:py-32">
        <p className="mb-5 inline-flex animate-fade-up items-center gap-2 rounded-full border border-gold-200 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-luxe text-gold-700 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Parfum Original Premium
        </p>

        <h1 className="mx-auto max-w-4xl animate-fade-up text-balance font-serif text-5xl font-medium leading-[1.05] text-stone-900 sm:text-6xl md:text-7xl">
          Parfum yang Menuturkan{' '}
          <span className="italic text-primary-600">Kisah Anda</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl animate-fade-up text-balance text-lg leading-relaxed text-stone-600">
          Koleksi parfum pilihan yang dirancang untuk membangkitkan kepercayaan
          diri dan meninggalkan kesan yang tak terlupakan.
        </p>

        <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/products"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary-600 px-8 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            Jelajahi Koleksi
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/quiz"
            className="inline-flex h-12 items-center justify-center rounded-full border border-stone-300 bg-white/60 px-8 text-sm font-medium text-stone-800 backdrop-blur transition-colors duration-200 hover:border-stone-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            Temukan Aroma Anda
          </Link>
        </div>
      </div>
    </section>
  );
}
