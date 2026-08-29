'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { LoadingPage } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';

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
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900">Keranjang Kosong</h1>
        <p className="mt-2 text-gray-500">
          Belum ada produk di keranjang Anda
        </p>
        <Link href="/products">
          <Button className="mt-6">Mulai Belanja</Button>
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Gagal Memuat Keranjang</h1>
        <p className="mt-2 text-gray-500">
          Terjadi kesalahan saat memuat data keranjang Anda
        </p>
        <Button className="mt-6" onClick={() => { setIsError(false); refreshCart(); }}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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

      <h1 className="mb-8 text-3xl font-bold text-gray-900">Keranjang Belanja</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.product.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      📷
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium text-gray-900 hover:text-primary-500"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {item.product.category}
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatCurrency(item.product.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => setDeleteConfirm({ open: true, productId: item.id })}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                  <div className="flex items-center rounded-lg border border-gray-300">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, Math.max(1, item.quantity - 1))
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      aria-label="Kurangi jumlah"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          Math.min(item.product.stock, item.quantity + 1)
                        )
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      aria-label="Tambah jumlah"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Gift Wrap Toggle */}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.giftWrap}
                  onChange={(e) => {
                    toggleGiftWrap(item.id, e.target.checked);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-600">🎁 Gift Wrapping (+Rp 15.000)</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-24 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Ringkasan Belanja
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal ({cart.summary.totalItems} item)
                </span>
                <span className="font-medium">
                  {formatCurrency(cart.summary.subtotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Ongkos Kirim</span>
                <span className="font-medium">
                  {shippingCost === 0
                    ? 'GRATIS'
                    : formatCurrency(shippingCost)}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon Promo</span>
                  <span className="font-medium">
                    -{formatCurrency(promoDiscount)}
                  </span>
                </div>
              )}

              <hr className="border-gray-200" />

              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Kode promo"
                  className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
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
              <p className="mt-3 text-xs text-gray-500">
                Gratis ongkir untuk pembelian di atas Rp 500.000
              </p>
            )}

            <Link href="/checkout">
              <Button className="mt-4 w-full" size="lg">
                Checkout
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
