'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Pagination } from '@oblintz/shared';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Subscription {
  id: string;
  frequency: string;
  status: string;
  nextDelivery: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; price: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'PAUSED', label: 'Dijeda' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
  PAUSED: { label: 'Dijeda', color: 'bg-yellow-100 text-yellow-800' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Bulanan',
  QUARTERLY: '3 Bulanan',
};

export default function AdminSubscriptionsPage() {
  const { toasts, error: showError } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const refreshSubscriptions = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    const token = localStorage.getItem('adminAccessToken');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/api/subscriptions/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      setSubscriptions(response.data.data.subscriptions);
      setPagination(response.data.data.pagination);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Gagal memuat langganan:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    refreshSubscriptions(1, controller.signal);
    return () => controller.abort();
  }, [refreshSubscriptions]);

  const handlePageChange = useCallback((page: number) => {
    refreshSubscriptions(page);
  }, [refreshSubscriptions]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <h1 className="text-2xl font-bold text-gray-900">Langganan</h1>

      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Tidak ada langganan ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Pelanggan</th>
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Frekuensi</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Pengiriman Berikutnya</th>
                  <th className="p-4 font-medium">Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{sub.user.name}</p>
                      <p className="text-xs text-gray-500">{sub.user.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{sub.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(sub.product.price)}
                      </p>
                    </td>
                    <td className="p-4 text-gray-600">
                      {FREQUENCY_LABELS[sub.frequency] || sub.frequency}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={sub.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="p-4 text-gray-600">
                      {sub.nextDelivery
                        ? new Date(sub.nextDelivery).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(sub.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t border-gray-200 p-4">
            {paginationPages.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`h-8 rounded-lg px-3 text-sm ${
                  p === pagination.page
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
