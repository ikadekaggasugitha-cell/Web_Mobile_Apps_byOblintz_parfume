import Link from 'next/link';

const SHOP_LINKS = [
  { href: '/products', label: 'Semua Koleksi' },
  { href: '/categories', label: 'Kategori' },
  { href: '/quiz', label: 'Quiz Parfum' },
];

const ACCOUNT_LINKS = [
  { href: '/login', label: 'Masuk' },
  { href: '/register', label: 'Daftar' },
  { href: '/account/orders', label: 'Pesanan Saya' },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="container mx-auto px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <p className="font-serif text-xl font-semibold tracking-[0.18em] text-espresso">
              OBLINTZ
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-warmgray">
              Parfum original premium — dikurasi untuk membangkitkan kepercayaan
              diri dan meninggalkan kesan yang tak terlupakan.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-luxe text-gold-600">
              Belanja
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-warmgray">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-luxe text-gold-600">
              Akun
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-warmgray">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-primary-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-luxe text-gold-600">
              Kontak
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-warmgray">
              <li>
                <a
                  href="mailto:support@oblintz.com"
                  className="transition-colors hover:text-primary-600"
                >
                  support@oblintz.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/6281234567890"
                  className="transition-colors hover:text-primary-600"
                >
                  +62 812 3456 7890
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-sm text-warmgray sm:flex-row">
          <p>&copy; 2026 OBLINTZ. Seluruh hak cipta dilindungi.</p>
          <p className="text-xs uppercase tracking-luxe text-gold-600">
            Parfum Original Premium
          </p>
        </div>
      </div>
    </footer>
  );
}
