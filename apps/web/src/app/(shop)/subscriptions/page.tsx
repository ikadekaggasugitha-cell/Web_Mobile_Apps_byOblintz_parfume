'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import api from '@/lib/api';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingPage } from '@/components/ui/Loading';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { PageHeader } from '@/components/layout/PageHeader';

interface Subscription {
  id: string;
  frequency: string;
  status: string;
  nextDelivery: string;
  lastDelivery: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    category: { name: string };
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'success' },
  PAUSED: { label: 'Dijeda', color: 'warning' },
  CANCELLED: { label: 'Dibatalkan', color: 'danger' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Bulanan',
  QUARTERLY: '3 Bulanan',
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const refreshSubscriptions = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setSubscriptions(response.data.data);
      setIsError(false);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat langganan:', err);
        setIsError(true);
      }
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    refreshSubscriptions(controller.signal).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [refreshSubscriptions]);

  const handlePause = useCallback(async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${id}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
      success('Langganan berhasil dijeda');
    } catch (err) {
      console.error('Gagal menjeda:', err);
      showError('Gagal menjeda langganan');
    }
  }, [refreshSubscriptions, success, showError]);

  const handleResume = useCallback(async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${id}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
      success('Langganan berhasil dilanjutkan');
    } catch (err) {
      console.error('Gagal melanjutkan:', err);
      showError('Gagal melanjutkan langganan');
    }
  }, [refreshSubscriptions, success, showError]);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelConfirm.id) return;

    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${cancelConfirm.id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
      success('Langganan berhasil dibatalkan');
    } catch (err) {
      console.error('Gagal membatalkan:', err);
      showError('Gagal membatalkan langganan');
    } finally {
      setCancelConfirm({ open: false, id: null });
    }
  }, [cancelConfirm.id, refreshSubscriptions, success, showError]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === 'ACTIVE'),
    [subscriptions]
  );
  const pausedSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === 'PAUSED'),
    [subscriptions]
  );
  const cancelledSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === 'CANCELLED'),
    [subscriptions]
  );

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-medium text-espresso">Gagal Memuat Langganan</h1>
        <p className="mt-2 text-warmgray">Terjadi kesalahan saat memuat data langganan Anda</p>
        <Button className="mt-6" onClick={() => { setIsError(false); refreshSubscriptions(); }}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={cancelConfirm.open}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelConfirm({ open: false, id: null })}
        title="Batalkan Langganan"
        message="Yakin ingin membatalkan langganan ini? Anda tidak dapat mengembalikan langganan yang sudah dibatalkan."
        confirmLabel="Ya, Batalkan"
        variant="danger"
      />

      <PageHeader
        eyebrow="Langganan"
        title="Langgananku"
        description="Kelola langganan parfum rutin Anda."
        className="mb-10"
      />

      {subscriptions.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="font-serif text-2xl font-medium text-espresso">
            Belum Ada Langganan
          </h2>
          <p className="mt-2 text-warmgray">
            Berlangganan untuk menerima parfum favorit Anda secara rutin.
          </p>
          <Link href="/products">
            <Button className="mt-6">Mulai Berlangganan</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {activeSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 font-serif text-lg font-medium text-espresso">
                Aktif ({activeSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={(id) => setCancelConfirm({ open: true, id })}
                  />
                ))}
              </div>
            </div>
          )}

          {pausedSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 font-serif text-lg font-medium text-espresso">
                Dijeda ({pausedSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pausedSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={(id) => setCancelConfirm({ open: true, id })}
                  />
                ))}
              </div>
            </div>
          )}

          {cancelledSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 font-serif text-lg font-medium text-espresso">
                Dibatalkan ({cancelledSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cancelledSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={(id) => setCancelConfirm({ open: true, id })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  onPause,
  onResume,
  onCancel,
}: {
  subscription: Subscription;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const status = STATUS_LABELS[subscription.status] || {
    label: subscription.status,
    color: 'secondary',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-line bg-sand">
            <ProductImage
              src={resolveImageUrl(subscription.product.images?.[0])}
              alt={subscription.product.name}
              width={80}
              height={80}
              unoptimized
              fallbackClassName="text-xs"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1">
            <Link
              href={`/products/${subscription.product.id}`}
              className="font-serif text-lg font-medium text-espresso transition-colors hover:text-primary-700"
            >
              {subscription.product.name}
            </Link>
            <p className="text-xs uppercase tracking-luxe text-gold-600">
              {subscription.product.category.name}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={status.color as 'success' | 'warning' | 'danger'}>{status.label}</Badge>
              <span className="text-sm text-warmgray">
                {FREQUENCY_LABELS[subscription.frequency] || subscription.frequency}
              </span>
            </div>
          </div>
        </div>

        {subscription.status === 'ACTIVE' && subscription.nextDelivery && (
          <div className="mt-4 rounded-xl border border-line bg-sand p-3 text-sm">
            <p className="text-warmgray">
              Pengiriman berikutnya:{' '}
              <span className="font-medium text-espresso">
                {new Date(subscription.nextDelivery).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {subscription.status === 'ACTIVE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(subscription.id)}
              >
                Jeda
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(subscription.id)}
                className="text-red-500 hover:text-red-600"
              >
                Batalkan
              </Button>
            </>
          )}
          {subscription.status === 'PAUSED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResume(subscription.id)}
              >
                Lanjutkan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(subscription.id)}
                className="text-red-500 hover:text-red-600"
              >
                Batalkan
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
