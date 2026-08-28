import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-5xl font-bold text-gray-900">
          Welcome to <span className="text-primary-600">OBLINTZ</span>
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Temukan parfum premium yang mencerminkan gaya Anda
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/products"
            className="rounded-lg bg-primary-600 px-8 py-3 text-white hover:bg-primary-700"
          >
            Jelajahi Katalog
          </Link>
          <Link
            href="/quiz"
            className="rounded-lg border border-primary-600 px-8 py-3 text-primary-600 hover:bg-primary-50"
          >
            Quiz Parfum
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="rounded-lg border p-6 text-center shadow-sm">
          <div className="mb-4 text-4xl">🌸</div>
          <h3 className="mb-2 text-lg font-semibold">Katalog Premium</h3>
          <p className="text-gray-600">Koleksi parfum premium pilihan</p>
        </div>
        <div className="rounded-lg border p-6 text-center shadow-sm">
          <div className="mb-4 text-4xl">✨</div>
          <h3 className="mb-2 text-lg font-semibold">Quiz Rekomendasi</h3>
          <p className="text-gray-600">Temukan parfum sesuai preferensi</p>
        </div>
        <div className="rounded-lg border p-6 text-center shadow-sm">
          <div className="mb-4 text-4xl">🎁</div>
          <h3 className="mb-2 text-lg font-semibold">Gift Wrapping</h3>
          <p className="text-gray-600">Kado spesial untuk orang tersayang</p>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-lg bg-primary-600 p-12 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">Mulai Belanja Sekarang</h2>
        <p className="mb-6 text-lg">
          Dapatkan diskon 10% untuk pembelian pertama Anda
        </p>
        <Link
          href="/products"
          className="inline-block rounded-lg bg-white px-8 py-3 text-primary-600 hover:bg-gray-100"
        >
          Lihat Produk
        </Link>
      </section>
    </div>
  );
}
