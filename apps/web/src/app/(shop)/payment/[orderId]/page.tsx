'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading, LoadingPage } from '@/components/ui/Loading';
import { PageHeader } from '@/components/layout/PageHeader';

const POLL_INTERVAL_MS = 5000;

interface PaymentStatusData {
  transactionId: string;
  status: string;
  amount: string;
  qrCode: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

function isPaid(order?: { status: string }) {
  return order?.status === 'PAID';
}

function isFailed(data?: PaymentStatusData | null) {
  if (!data) return false;
  return (
    ['FAILED', 'EXPIRED'].includes(data.status) ||
    ['CANCELLED', 'REFUNDED'].includes(data.order.status)
  );
}

function QrDisplay({ qrCode }: { qrCode: string | null }) {
  if (!qrCode) {
    return (
      <p className="text-sm text-warmgray">
        Kode pembayaran belum tersedia. Silakan tunggu sebentar.
      </p>
    );
  }

  const isImageUrl = /^https?:\/\//i.test(qrCode);
  if (isImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={qrCode}
        alt="QR Code Pembayaran QRIS"
        width={224}
        height={224}
        className="h-56 w-56 rounded-[12px] border border-line bg-white p-2"
      />
    );
  }

  // Payload QRIS mentah (mis. mode simulasi tanpa MIDTRANS_SERVER_KEY) —
  // tidak bisa dirender sebagai gambar tanpa encoder QR.
  return (
    <div className="w-full space-y-2">
      <p className="text-xs text-warmgray">Kode QRIS (simulasi):</p>
      <code className="block break-all rounded-[12px] border border-line bg-sand p-3 text-xs text-espresso">
        {qrCode}
      </code>
    </div>
  );
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<PaymentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/api/payments/status/${orderId}`);
      const payload: PaymentStatusData = res.data.data;
      setData(payload);
      if (isPaid(payload.order) || isFailed(payload)) {
        stopPolling();
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
        stopPolling();
      }
      // Error sementara (jaringan/5xx): jangan hentikan polling.
    } finally {
      setIsLoading(false);
    }
  }, [orderId, stopPolling]);

  useEffect(() => {
    if (!orderId) return;

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [orderId, fetchStatus, stopPolling]);

  if (isLoading) return <LoadingPage />;

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <PageHeader eyebrow="Pembayaran" title="Pembayaran Tidak Ditemukan" className="mb-8" />
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-warmgray">
              Kami tidak menemukan pembayaran untuk pesanan ini.
            </p>
            <Link href="/cart">
              <Button>Kembali ke Keranjang</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paid = isPaid(data?.order);
  const failed = isFailed(data);
  const amount = data ? Number(data.amount) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <PageHeader eyebrow="Pembayaran" title="Selesaikan Pembayaran" className="mb-8" />

      <Card>
        <CardHeader>
          <CardTitle>
            {paid
              ? 'Pembayaran Berhasil'
              : failed
                ? 'Pembayaran Gagal'
                : 'Menunggu Pembayaran'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-warmgray">Nomor Pesanan</span>
            <span className="font-medium text-espresso">
              {data?.order.orderNumber ?? '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-warmgray">Total Pembayaran</span>
            <span className="font-serif text-xl font-medium text-espresso">
              {formatCurrency(amount)}
            </span>
          </div>

          <hr className="border-line" />

          {paid ? (
            <div className="space-y-4 py-6 text-center">
              <p className="text-espresso">
                Terima kasih! Pembayaran Anda telah kami terima.
              </p>
              <Link href="/products">
                <Button>Lanjut Belanja</Button>
              </Link>
            </div>
          ) : failed ? (
            <div className="space-y-4 py-6 text-center">
              <p className="text-espresso">
                Pembayaran tidak dapat diselesaikan atau telah kedaluwarsa.
              </p>
              <Link href="/cart">
                <Button>Kembali ke Keranjang</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-sm text-warmgray">
                Pindai kode QRIS berikut dengan aplikasi e-wallet atau mobile banking Anda.
              </p>
              <QrDisplay qrCode={data?.qrCode ?? null} />
              <div className="flex items-center gap-2 text-sm text-warmgray">
                <Loading size="sm" />
                <span>Menunggu konfirmasi pembayaran…</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
