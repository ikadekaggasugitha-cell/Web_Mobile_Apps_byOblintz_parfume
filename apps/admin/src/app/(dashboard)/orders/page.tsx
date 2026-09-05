'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Pagination } from '@oblintz/shared';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { name: string; email: string };
  items: { product: { name: string }; quantity: number }[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'WAITING_PAYMENT', label: 'Menunggu Bayar' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'SHIPPED', label: 'Dikirim' },
  { value: 'DELIVERED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
  WAITING_PAYMENT: { label: 'Bayar', color: 'bg-orange-100 text-orange-800' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Proses', color: 'bg-purple-100 text-purple-800' },
  SHIPPED: { label: 'Kirim', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Selesai', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Batal', color: 'bg-red-100 text-red-800' },
};

export default function AdminOrdersPage() {
  const { toasts, success, error: showError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const refreshOrders = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    const token = localStorage.getItem('adminAccessToken');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/api/orders/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      setOrders(response.data.data.orders);
      setPagination(response.data.data.pagination);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Gagal memuat pesanan:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    refreshOrders(1, controller.signal);
    return () => controller.abort();
  }, [refreshOrders]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  const updateStatus = useCallback(async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.put(
        `/api/orders/admin/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshOrders();
      success('Status pesanan berhasil diupdate');
    } catch (error) {
      console.error('Gagal update status:', error);
      showError('Gagal mengupdate status pesanan');
    }
  }, [refreshOrders, success, showError]);

  const handlePageChange = useCallback((page: number) => {
    refreshOrders(page);
  }, [refreshOrders]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <p className="text-sm text-slate-500">
        Pantau dan perbarui status pesanan pelanggan.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor pesanan..."
            aria-label="Cari nomor pesanan"
            className="input w-full pl-9"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status pesanan"
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
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShoppingCart className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Tidak ada pesanan ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Coba ubah kata kunci atau filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Nomor</th>
                  <th className="th">Pelanggan</th>
                  <th className="th">Item</th>
                  <th className="th">Total</th>
                  <th className="th">Status</th>
                  <th className="th">Tanggal</th>
                  <th className="th">Ubah Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="td font-medium text-slate-900">
                      {order.orderNumber}
                    </td>
                    <td className="td">
                      <p className="text-slate-900">{order.user.name}</p>
                      <p className="text-xs text-slate-500">
                        {order.user.email}
                      </p>
                    </td>
                    <td className="td tabular-nums text-slate-500">
                      {order.items.length} item
                    </td>
                    <td className="td font-medium tabular-nums text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="td">
                      <StatusBadge status={order.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="td tabular-nums text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="td">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        aria-label={`Ubah status pesanan ${order.orderNumber}`}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 transition-colors focus:border-primary-500 focus:outline-none"
                      >
                        {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
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
