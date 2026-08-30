import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function BrandStory() {
  return (
    <Section tone="sand">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <div>
          <Eyebrow className="mb-4">Kisah Kami</Eyebrow>
          <h2 className="font-serif text-3xl font-medium leading-tight tracking-[-0.01em] text-espresso sm:text-4xl">
            Bertahun Meracik,{' '}
            <span className="italic text-primary-700">Ribuan Kisah</span> Berbeda
          </h2>
          <p className="mt-5 text-base font-medium text-espresso/80">
            Dari nuansa siang yang lembut — temukan aroma yang bergerak bersama
            Anda.
          </p>
          <p className="mt-4 text-base leading-relaxed text-warmgray">
            Di balik setiap botol ada warisan seni dan niat. Selama bertahun-tahun
            kami meracik wewangian yang menangkap momen, emosi, dan identitas —
            memadukan tradisi dengan penceritaan olfaktori modern.
          </p>

          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-[10px] border border-line bg-white px-7 text-sm font-medium text-espresso transition-colors duration-200 hover:border-primary-300 hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            Pelajari Koleksi
          </Link>

          {/* Scent journey feature */}
          <div className="mt-10 flex items-start gap-4 border-t border-line pt-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-ivory">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-medium text-espresso">
                Pilih Perjalanan Aroma Anda
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-warmgray">
                Jelajahi rangkaian rencana wewangian terkurasi — pilih yang sesuai
                gaya dan ritme Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Art-directed panel */}
        <div className="relative order-first aspect-[5/4] overflow-hidden rounded-[24px] ring-1 ring-line lg:order-last">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-espresso via-primary-900 to-primary-700"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(198,161,91,0.32),transparent_58%)]"
          />
          <span
            aria-hidden="true"
            className="absolute left-6 top-6 text-xl text-gold-400/70"
          >
            ✦
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-6xl italic tracking-tight text-ivory/90 sm:text-7xl">
              OBLINTZ
            </span>
            <span className="mt-3 text-xs uppercase tracking-luxe text-gold-300">
              Maison de Parfum · Est. 2026
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}
