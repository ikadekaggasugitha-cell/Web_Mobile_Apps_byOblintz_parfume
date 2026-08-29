'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { CartData } from '@oblintz/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/Loading';
import { useToast, ToastContainer } from '@/components/ui/Toast';

const checkoutSchema = z.object({
  name: z.string().min(2, 'Nama harus minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor telepon tidak valid'),
  address: z.string().min(5, 'Alamat harus minimal 5 karakter'),
  city: z.string().min(2, 'Kota diperlukan'),
  province: z.string().min(2, 'Provinsi diperlukan'),
  postalCode: z.string().min(5, 'Kode pos tidak valid'),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
  notes: z.string().optional(),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { toasts, error: showError } = useToast();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shippingMethod: 'standard' },
  });

  const shippingMethod = watch('shippingMethod');

  useEffect(() => {
    const controller = new AbortController();

    const fetchCart = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await api.get('/api/cart', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setCart(response.data.data);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal memuat keranjang:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();

    return () => controller.abort();
  }, [router]);

  const onSubmit = useCallback(async (data: CheckoutInput) => {
    setIsSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await api.post(
        '/api/checkout',
        {
          shippingAddress: {
            name: data.name,
            phone: data.phone,
            address: data.address,
            city: data.city,
            province: data.province,
            postalCode: data.postalCode,
          },
          shippingMethod: data.shippingMethod,
          notes: data.notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { orderId } = response.data.data;

      await api.post(
        '/api/payments/create',
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push(`/payment/${orderId}`);
    } catch (err: any) {
      showError(err.response?.data?.error?.message || 'Checkout gagal');
    } finally {
      setIsSubmitting(false);
    }
  }, [router, showError]);

  const shippingCost = useMemo(
    () => (shippingMethod === 'express' ? 35000 : 15000),
    [shippingMethod]
  );

  const freeShipping = useMemo(
    () => cart && cart.summary.subtotal >= 500000,
    [cart]
  );

  const actualShipping = useMemo(
    () => (freeShipping ? 0 : shippingCost),
    [freeShipping, shippingCost]
  );

  const total = useMemo(
    () => (cart ? cart.summary.subtotal + actualShipping : 0),
    [cart, actualShipping]
  );

  if (isLoading) return <LoadingPage />;
  if (!cart || cart.items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ToastContainer toasts={toasts} />
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Shipping Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alamat Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nama Lengkap"
                    {...register('name')}
                    error={errors.name?.message}
                  />
                  <Input
                    label="Nomor Telepon"
                    type="tel"
                    {...register('phone')}
                    error={errors.phone?.message}
                  />
                </div>
                <Input
                  label="Alamat Lengkap"
                  {...register('address')}
                  error={errors.address?.message}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Kota"
                    {...register('city')}
                    error={errors.city?.message}
                  />
                  <Input
                    label="Provinsi"
                    {...register('province')}
                    error={errors.province?.message}
                  />
                  <Input
                    label="Kode Pos"
                    {...register('postalCode')}
                    error={errors.postalCode?.message}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pengiriman</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="standard"
                      {...register('shippingMethod')}
                      className="text-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Reguler (3-5 hari)</p>
                      <p className="text-sm text-gray-500">Estimasi 3-5 hari kerja</p>
                    </div>
                    <span className="font-medium">
                      {freeShipping ? 'GRATIS' : formatCurrency(15000)}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="express"
                      {...register('shippingMethod')}
                      className="text-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Express (1-2 hari)</p>
                      <p className="text-sm text-gray-500">Estimasi 1-2 hari kerja</p>
                    </div>
                    <span className="font-medium">
                      {freeShipping ? 'GRATIS' : formatCurrency(35000)}
                    </span>
                  </label>
                </div>
                <Input
                  label="Catatan (opsional)"
                  placeholder="Catatan untuk penjual..."
                  className="mt-4"
                  {...register('notes')}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Ringkasan Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}

                <hr />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(cart.summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ongkos Kirim</span>
                    <span>
                      {actualShipping === 0
                        ? 'GRATIS'
                        : formatCurrency(actualShipping)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isSubmitting}
                >
                  Buat Pesanan
                </Button>

                <p className="text-xs text-center text-gray-500">
                  Dengan melakukan pemesanan, Anda menyetujui syarat & ketentuan
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
