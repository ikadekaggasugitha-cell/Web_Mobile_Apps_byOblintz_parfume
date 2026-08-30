'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { LoadingPage } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { PageHeader } from '@/components/layout/PageHeader';

interface CartItem {
  id: string;
  quantity: number;
  giftWrap: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number | null;
    images: string[];
    stock: number;
    category: string;
  };
  subtotal: number;
}

interface CartData {
  items: CartItem[];
  summary: {
    subtotal: number;
    totalItems: number;
  };
}

export default function CartPage() {
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });

  const refreshCart = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setCart(response.data.data);
      setIsError(false);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat keranjang:', err);
        setIsError(true);
      }
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    refreshCart(controller.signal).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [refreshCart]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = localStorage.getItem('accessToken');
      try {
        await api.put(
          `/api/cart/items/${productId}`,
          { quantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        refreshCart();
      } catch (err) {
        console.error('Gagal update:', err);
      }
    }, 300);
  }, [refreshCart]);

  const toggleGiftWrap = useCallback(async (productId: string, giftWrap: boolean) => {
    const token = localStorage.getItem('accessToken');
    try {
      const item = cart?.items.find((i) => i.id === productId);
      if (!item) return;
      await api.put(
        `/api/cart/items/${productId}`,
        { quantity: item.quantity, giftWrap },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshCart();
    } catch (err) {
      console.error('Gagal update gift wrap:', err);
    }
  }, [cart, refreshCart]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.productId) return;
    const token = localStorage.getItem('accessToken');
    try {
      await api.delete(`/api/cart/items/${deleteConfirm.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshCart();
      success('Produk dihapus dari keranjang');
    } catch (err) {
      console.error('Gagal hapus:', err);
      showError('Gagal menghapus produk');
    } finally {
      setDeleteConfirm({ open: false, productId: null });
    }
  }, [deleteConfirm.productId, refreshCart, success, showError]);

  const applyPromo = useCallback(async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);

    const token = localStorage.getItem('accessToken');
    try {
      const response = await api.post(
        '/api/cart/apply-promo',
        { code: promoCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPromoDiscount(response.data.data.discount);
      success('Kode promo berhasil diterapkan');
    } catch (err: any) {
      showError(err.response?.data?.error?.message || 'Kode promo tidak valid');
      setPromoDiscount(0);
    } finally {
      setIsApplyingPromo(false);
    }
  }, [promoCode, success, showError]);

  const shippingCost = useMemo(
    () => (cart && cart.summary.subtotal >= 500000 ? 0 : 15000),
    [cart]
  );

  const total = useMemo(
    () => (cart ? cart.summary.subtotal + shippingCost - promoDiscount : 0),
    [cart, shippingCost, promoDiscount]
  );

  if (isLoading) return <LoadingPage />;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-medium text-espresso">Keranjang Kosong</h1>
        <p className="mt-2 text-warmgray">
          Belum ada parfum di keranjang Anda.
        </p>
        <Link href="/products">
          <Button className="mt-6">Mulai Belanja</Button>
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-medium text-espresso">Gagal Memuat Keranjang</h1>
        <p className="mt-2 text-warmgray">
          Terjadi kesalahan saat memuat data keranjang Anda
        </p>
        <Button className="mt-6" onClick={() => { setIsError(false); refreshCart(); }}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, productId: null })}
        title="Hapus Produk"
        message="Yakin ingin menghapus produk ini dari keranjang?"
        confirmLabel="Hapus"
        variant="danger"
      />

      <PageHeader eyebrow="Keranjang" title="Keranjang Belanja" className="mb-10" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-line bg-sand">
                  <ProductImage
                    src={resolveImageUrl(item.product.images?.[0])}
                    alt={item.product.name}
                    width={96}
                    height={96}
                    fallbackClassName="text-sm"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-serif text-lg font-medium text-espresso transition-colors hover:text-primary-700"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs uppercase tracking-luxe text-gold-600">
                    {item.product.category}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-espresso">
                    {formatCurrency(item.product.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => setDeleteConfirm({ open: true, productId: item.id })}
                    className="text-xs font-medium uppercase tracking-luxe text-warmgray transition-colors hover:text-red-600"
                  >
                    Hapus
                  </button>
                  <div className="flex items-center rounded-[10px] border border-line">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, Math.max(1, item.quantity - 1))
                      }
                      className="px-3 py-1.5 text-espresso transition-colors hover:bg-sand"
                      aria-label="Kurangi jumlah"
                    >
                      −
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium text-espresso">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          Math.min(item.product.stock, item.quantity + 1)
                        )
                      }
                      className="px-3 py-1.5 text-espresso transition-colors hover:bg-sand"
                      aria-label="Tambah jumlah"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Gift Wrap Toggle */}
              <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-sm">
                <input
                  type="checkbox"
                  checked={item.giftWrap}
                  onChange={(e) => {
                    toggleGiftWrap(item.id, e.target.checked);
                  }}
                  className="h-4 w-4 rounded border-line accent-primary-600"
                />
                <span className="text-warmgray">Tambahkan Gift Wrapping (+Rp 15.000)</span>
              </label>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 p-6">
            <h2 className="mb-5 font-serif text-xl font-medium text-espresso">
              Ringkasan Belanja
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-warmgray">
                  Subtotal ({cart.summary.totalItems} item)
                </span>
                <span className="font-medium text-espresso">
                  {formatCurrency(cart.summary.subtotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-warmgray">Ongkos Kirim</span>
                <span className="font-medium text-espresso">
                  {shippingCost === 0
                    ? 'GRATIS'
                    : formatCurrency(shippingCost)}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Diskon Promo</span>
                  <span className="font-medium">
                    -{formatCurrency(promoDiscount)}
                  </span>
                </div>
              )}

              <hr className="border-line" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-espresso">Total</span>
                <span className="font-serif text-xl font-medium text-espresso">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="mt-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Kode promo"
                  className="h-11 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-sm text-espresso placeholder:text-warmgray/60 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyPromo}
                  isLoading={isApplyingPromo}
                >
                  Terapkan
                </Button>
              </div>
            </div>

            {shippingCost > 0 && (
              <p className="mt-3 text-xs text-warmgray">
                Gratis ongkir untuk pembelian di atas Rp 500.000
              </p>
            )}

            <Link href="/checkout">
              <Button className="mt-5 w-full" size="lg">
                Lanjut ke Checkout
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
