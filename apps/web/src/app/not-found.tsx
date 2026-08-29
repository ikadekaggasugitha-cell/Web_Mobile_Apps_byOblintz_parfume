import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-7xl">🔍</span>
      <h1 className="mt-6 text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-3 text-lg text-gray-500">
        Halaman yang Anda cari tidak ditemukan
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
        >
          Kembali ke Beranda
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Lihat Produk
        </Link>
      </div>
    </div>
  );
}
