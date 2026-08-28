import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold text-primary-600">OBLINTZ</h3>
            <p className="text-gray-600">
              Premium perfume e-commerce platform
            </p>
          </div>
          
          <div>
            <h4 className="mb-4 font-semibold">Shop</h4>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="/products" className="hover:text-primary-600">Semua Produk</Link></li>
              <li><Link href="/categories" className="hover:text-primary-600">Kategori</Link></li>
              <li><Link href="/quiz" className="hover:text-primary-600">Quiz Parfum</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 font-semibold">Account</h4>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="/login" className="hover:text-primary-600">Masuk</Link></li>
              <li><Link href="/register" className="hover:text-primary-600">Daftar</Link></li>
              <li><Link href="/account/orders" className="hover:text-primary-600">Pesanan Saya</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 font-semibold">Contact</h4>
            <ul className="space-y-2 text-gray-600">
              <li>Email: support@oblintz.com</li>
              <li>WhatsApp: +62 812 3456 7890</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t pt-8 text-center text-gray-600">
          <p>&copy; 2026 OBLINTZ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
