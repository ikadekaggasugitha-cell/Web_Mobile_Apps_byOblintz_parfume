'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Repeat } from 'lucide-react';
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
      <p className="text-sm text-slate-500">
        Kelola langganan pelanggan yang aktif dan berakhir.
      </p>

      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status langganan"
          className="input sm:w-48"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Repeat className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Tidak ada langganan ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Coba ubah filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Pelanggan</th>
                  <th className="th">Produk</th>
                  <th className="th">Frekuensi</th>
                  <th className="th">Status</th>
                  <th className="th">Pengiriman Berikutnya</th>
                  <th className="th">Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="td">
                      <p className="font-medium text-slate-900">{sub.user.name}</p>
                      <p className="text-xs text-slate-500">{sub.user.email}</p>
                    </td>
                    <td className="td">
                      <p className="font-medium text-slate-900">{sub.product.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(sub.product.price)}
                      </p>
                    </td>
                    <td className="td text-slate-600">
                      {FREQUENCY_LABELS[sub.frequency] || sub.frequency}
                    </td>
                    <td className="td">
                      <StatusBadge status={sub.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="td tabular-nums text-slate-600">
                      {sub.nextDelivery
                        ? new Date(sub.nextDelivery).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="td tabular-nums text-slate-500">
                      {new Date(sub.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Halaman{' '}
              <span className="font-medium text-slate-700">{pagination.page}</span>{' '}
              dari{' '}
              <span className="font-medium text-slate-700">{pagination.totalPages}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paginationPages.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  aria-current={p === pagination.page ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    p === pagination.page
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
