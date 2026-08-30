import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from './SectionHeading';

const COLLECTIONS = [
  {
    name: 'Untuk Dia',
    tagline: 'Maskulin, hangat, berkarakter',
    href: '/products?category=pria',
    gradient: 'from-espresso via-primary-900 to-primary-800',
  },
  {
    name: 'Untuk Dirinya',
    tagline: 'Lembut, floral, memikat',
    href: '/products?category=wanita',
    gradient: 'from-primary-800 via-primary-700 to-rosewood-500',
  },
  {
    name: 'Unisex',
    tagline: 'Netral, segar, serbaguna',
    href: '/products?category=unisex',
    gradient: 'from-primary-900 via-primary-800 to-gold-700',
  },
  {
    name: 'Signature',
    tagline: 'Eksklusif, langka, ikonik',
    href: '/products?sort=popular',
    gradient: 'from-espresso via-primary-900 to-primary-700',
  },
];

export function FeaturedCollections() {
  return (
    <Section tone="ivory">
      <SectionHeading
        align="center"
        eyebrow="Koleksi Pilihan"
        title="Temukan Sesuai Kepribadian"
        description="Setiap koleksi dikurasi untuk melengkapi karakter dan suasana hati Anda."
      />

      <div className="mt-14 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {COLLECTIONS.map((collection) => (
          <Link
            key={collection.name}
            href={collection.href}
            className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            {/* art-directed surface */}
            <div
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-br ${collection.gradient} transition-transform duration-[600ms] ease-out group-hover:scale-105`}
            />
            <span
              aria-hidden="true"
              className="absolute right-4 top-4 text-lg text-gold-400/60"
            >
              ✦
            </span>
            {/* legibility scrim */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-primary-950/10 to-transparent"
            />

            <div className="relative p-5">
              <h3 className="font-serif text-xl font-medium text-ivory sm:text-2xl">
                {collection.name}
              </h3>
              <p className="mt-1 text-xs text-ivory/70 sm:text-sm">
                {collection.tagline}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-luxe text-gold-300">
                Lihat Koleksi
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
