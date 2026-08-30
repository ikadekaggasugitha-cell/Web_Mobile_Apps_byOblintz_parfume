import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-luxe text-gold-600">Halaman Tidak Ditemukan</p>
      <h1 className="mt-4 font-serif text-6xl font-medium text-espresso sm:text-7xl">404</h1>
      <p className="mt-4 max-w-md text-warmgray">
        Maaf, halaman yang Anda cari tidak dapat ditemukan — mungkin telah
        dipindahkan atau tidak lagi tersedia.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-primary-600 px-7 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Kembali ke Beranda
        </Link>
        <Link
          href="/products"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-line px-7 text-sm font-medium text-espresso transition-colors hover:bg-sand"
        >
          Jelajahi Koleksi
        </Link>
      </div>
    </div>
  );
}
