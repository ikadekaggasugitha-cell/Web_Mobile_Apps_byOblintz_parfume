import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const COLLECTIONS = [
  {
    name: 'Untuk Dia',
    tagline: 'Maskulin, hangat, berkarakter',
    href: '/products?category=pria',
    gradient: 'from-stone-800 via-stone-700 to-primary-900',
  },
  {
    name: 'Untuk Dirinya',
    tagline: 'Lembut, floral, memikat',
    href: '/products?category=wanita',
    gradient: 'from-primary-500 via-primary-400 to-gold-300',
  },
  {
    name: 'Unisex',
    tagline: 'Netral, segar, serbaguna',
    href: '/products?category=unisex',
    gradient: 'from-gold-600 via-gold-500 to-stone-400',
  },
];

export function FeaturedCollections() {
  return (
    <section className="bg-cream py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="Koleksi Pilihan"
          title="Temukan Sesuai Kepribadian"
          description="Setiap koleksi dikurasi untuk melengkapi karakter dan suasana hati Anda."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {COLLECTIONS.map((collection) => (
            <Link
              key={collection.name}
              href={collection.href}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl p-7 text-white shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <div
                aria-hidden="true"
                className={`absolute inset-0 bg-gradient-to-br ${collection.gradient} transition-transform duration-500 ease-out group-hover:scale-105`}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
              />
              <div className="relative">
                <h3 className="font-serif text-2xl font-medium">
                  {collection.name}
                </h3>
                <p className="mt-1 text-sm text-white/85">
                  {collection.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                  Lihat Koleksi
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
