import Link from 'next/link';

export function BrandStory() {
  return (
    <section className="bg-cream py-20 sm:py-24">
      <div className="container mx-auto grid grid-cols-1 items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
        {/* Editorial visual — refined layered gradient stands in for photography */}
        <div className="relative order-last aspect-[5/4] overflow-hidden rounded-2xl ring-1 ring-black/5 lg:order-first">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-stone-900 via-primary-900 to-primary-700"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(207,162,79,0.35),transparent_55%)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-6xl italic tracking-tight text-white/90 sm:text-7xl">
              OBLINTZ
            </span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-luxe text-gold-600">
            Filosofi Kami
          </p>
          <h2 className="font-serif text-3xl font-medium leading-tight text-stone-900 sm:text-4xl">
            Seni Meracik Aroma yang Bermakna
          </h2>
          <p className="mt-5 text-base leading-relaxed text-stone-600">
            Kami percaya bahwa parfum bukan sekadar wewangian — melainkan bagian
            dari identitas. Setiap botol dalam koleksi kami dipilih dengan cermat,
            memadukan bahan berkualitas dan komposisi yang seimbang untuk
            menghadirkan pengalaman yang autentik.
          </p>
          <p className="mt-4 text-base leading-relaxed text-stone-600">
            Dari nuansa segar hingga aroma yang hangat dan mendalam, temukan
            wewangian yang benar-benar mencerminkan diri Anda.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-7 text-sm font-medium text-stone-800 transition-colors duration-200 hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            Pelajari Koleksi
          </Link>
        </div>
      </div>
    </section>
  );
}
