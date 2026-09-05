'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, Wallet, Package, Users, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

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

  const statCards = useMemo<
    { title: string; value: string | number; icon: LucideIcon; tone: string }[]
  >(
    () => [
      { title: 'Total Pesanan', value: stats.totalOrders, icon: ShoppingCart, tone: 'bg-blue-50 text-blue-600' },
      { title: 'Total Pendapatan', value: formatCurrency(stats.totalRevenue), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
      { title: 'Total Produk', value: stats.totalProducts, icon: Package, tone: 'bg-violet-50 text-violet-600' },
      { title: 'Total Pengguna', value: stats.totalUsers, icon: Users, tone: 'bg-amber-50 text-amber-600' },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Selamat datang kembali
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan performa toko OBLINTZ hari ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="card p-5 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-900">
          Pesanan Terbaru
        </h2>

        {isLoading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Belum ada pesanan
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-semibold sm:px-6">Nomor</th>
                  <th className="px-3 py-2.5 font-semibold">Pelanggan</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold sm:px-6">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900 sm:px-6">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {order.user.name}
                    </td>
                    <td className="px-3 py-3 font-medium tabular-nums text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-500 sm:px-6">
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
