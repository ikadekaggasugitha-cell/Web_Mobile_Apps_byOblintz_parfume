import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold text-primary-600">
          OBLINTZ
        </Link>
        
        <nav className="hidden items-center gap-8 md:flex">
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
          <Link href="/cart" className="text-gray-600 hover:text-primary-600">
            🛒
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-primary-600 px-4 py-2 text-primary-600 hover:bg-primary-50"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Daftar
          </Link>
        </div>
      </div>
    </header>
  );
}
