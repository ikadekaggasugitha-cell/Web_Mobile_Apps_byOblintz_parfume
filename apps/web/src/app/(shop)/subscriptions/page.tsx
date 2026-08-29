'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingPage } from '@/components/ui/Loading';

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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscriptions = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await api.get('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscriptions(response.data.data);
    } catch (error) {
      console.error('Gagal memuat langganan:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await api.get('/api/subscriptions', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setSubscriptions(response.data.data);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat langganan:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, []);

  const handlePause = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${id}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
    } catch (error) {
      console.error('Gagal menjeda:', error);
    }
  };

  const handleResume = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${id}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
    } catch (error) {
      console.error('Gagal melanjutkan:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan langganan ini?')) return;

    const token = localStorage.getItem('accessToken');
    try {
      await api.post(
        `/api/subscriptions/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSubscriptions();
    } catch (error) {
      console.error('Gagal membatalkan:', error);
    }
  };

  if (isLoading) return <LoadingPage />;

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE');
  const pausedSubscriptions = subscriptions.filter((s) => s.status === 'PAUSED');
  const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'CANCELLED');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Langgananku</h1>
        <p className="mt-1 text-gray-500">
          Kelola langganan parfum rutinmu
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="py-16 text-center">
          <span className="text-6xl">📦</span>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Belum Ada Langganan
          </h2>
          <p className="mt-2 text-gray-500">
            Berlangganan untuk mendapatkan parfum favoritmu secara rutin
          </p>
          <Link href="/products">
            <Button className="mt-6">Mulai Berlangganan</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Aktif ({activeSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Paused Subscriptions */}
          {pausedSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Dijeda ({pausedSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pausedSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Subscriptions */}
          {cancelledSubscriptions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Dibatalkan ({cancelledSubscriptions.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cancelledSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onPause={handlePause}
                    onResume={handleResume}
                    onCancel={handleCancel}
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

function SubscriptionCard({
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
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {subscription.product.images?.[0] ? (
              <Image
                src={subscription.product.images[0]}
                alt={subscription.product.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                📷
              </div>
            )}
          </div>

          <div className="flex-1">
            <Link
              href={`/products/${subscription.product.id}`}
              className="font-medium text-gray-900 hover:text-primary-500"
            >
              {subscription.product.name}
            </Link>
            <p className="text-sm text-gray-500">
              {subscription.product.category.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={status.color as any}>{status.label}</Badge>
              <span className="text-sm text-gray-500">
                {FREQUENCY_LABELS[subscription.frequency] || subscription.frequency}
              </span>
            </div>
          </div>
        </div>

        {/* Next Delivery */}
        {subscription.status === 'ACTIVE' && subscription.nextDelivery && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
            <p className="text-gray-600">
              Pengiriman berikutnya:{' '}
              <span className="font-medium text-gray-900">
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

        {/* Actions */}
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
}
