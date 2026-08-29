'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { name: string; email: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
  WAITING_PAYMENT: { label: 'Bayar', color: 'bg-orange-100 text-orange-800' },
  PAID: { label: 'Dibayar', color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Proses', color: 'bg-purple-100 text-purple-800' },
  SHIPPED: { label: 'Kirim', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Selesai', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Batal', color: 'bg-red-100 text-red-800' },
};

export default function AdminDashboard() {
  const { toasts, error: showError } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) return;

      try {
        const ordersRes = await api.get('/api/orders/admin/all?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const orders: RecentOrder[] = ordersRes.data.data.orders;
        const totalRevenue = orders
          .filter((o) => o.status === 'PAID' || o.status === 'DELIVERED')
          .reduce((sum, o) => sum + Number(o.totalAmount), 0);

        setStats({
          totalOrders: ordersRes.data.data.pagination.total,
          totalRevenue,
          totalProducts: 0,
          totalUsers: 0,
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal memuat dashboard:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();

    return () => controller.abort();
  }, []);

  const statCards = useMemo(
    () => [
      { title: 'Total Pesanan', value: stats.totalOrders, icon: '📦', color: 'bg-blue-500' },
      { title: 'Total Pendapatan', value: formatCurrency(stats.totalRevenue), icon: '💰', color: 'bg-green-500' },
      { title: 'Total Produk', value: stats.totalProducts, icon: '🏷️', color: 'bg-purple-500' },
      { title: 'Total Pengguna', value: stats.totalUsers, icon: '👥', color: 'bg-orange-500' },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div
                className={`${stat.color} flex h-12 w-12 items-center justify-center rounded-lg text-2xl`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Pesanan Terbaru
        </h2>

        {isLoading ? (
          <p className="text-gray-500">Memuat...</p>
        ) : recentOrders.length === 0 ? (
          <p className="text-gray-500">Belum ada pesanan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Nomor</th>
                  <th className="pb-3 font-medium">Pelanggan</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 text-gray-600">
                      {order.user.name}
                    </td>
                    <td className="py-3 font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_LABELS[order.status]?.color || 'bg-gray-100'
                        }`}
                      >
                        {STATUS_LABELS[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
