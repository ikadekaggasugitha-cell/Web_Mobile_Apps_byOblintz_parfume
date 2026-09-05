'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalOrders: number;
    ordersThisMonth: number;
    totalProducts: number;
    totalUsers: number;
    totalSubscriptions: number;
    revenueThisMonth: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    user: { name: string };
  }[];
  topProducts: {
    name: string;
    price: number;
    totalSold: number;
    orderCount: number;
  }[];
}

interface SalesData {
  period: string;
  summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  chart: { date: string; count: number; revenue: number }[];
}

export default function AdminReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState('daily');

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      const token = localStorage.getItem('adminAccessToken');
      try {
        const [dashRes, salesRes] = await Promise.all([
          api.get('/api/reports/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
          api.get(`/api/reports/sales?period=${salesPeriod}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        ]);
        setDashboard(dashRes.data.data);
        setSales(salesRes.data.data);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat laporan:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [salesPeriod]);

  const statCards = useMemo<
    { title: string; value: string | number; icon: LucideIcon; tone: string }[]
  >(() => {
    if (!dashboard) return [];
    return [
      { title: 'Total Pesanan', value: dashboard.stats.totalOrders, icon: ShoppingCart, tone: 'bg-blue-50 text-blue-600' },
      { title: 'Pendapatan Bulan Ini', value: formatCurrency(dashboard.stats.revenueThisMonth), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
      { title: 'Produk Aktif', value: dashboard.stats.totalProducts, icon: Package, tone: 'bg-violet-50 text-violet-600' },
      { title: 'Total Pengguna', value: dashboard.stats.totalUsers, icon: Users, tone: 'bg-amber-50 text-amber-600' },
      { title: 'Langganan Aktif', value: dashboard.stats.totalSubscriptions, icon: Repeat, tone: 'bg-cyan-50 text-cyan-600' },
      { title: 'Pesanan Bulan Ini', value: dashboard.stats.ordersThisMonth, icon: TrendingUp, tone: 'bg-pink-50 text-pink-600' },
    ];
  }, [dashboard]);

  const maxRevenue = useMemo(() => {
    if (!sales) return 1;
    return Math.max(...sales.chart.map((d) => d.revenue), 1);
  }, [sales]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat laporan...</div>;
  if (!dashboard || !sales) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="card p-5 transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Penjualan</h2>
          <select
            value={salesPeriod}
            onChange={(e) => setSalesPeriod(e.target.value)}
            className="h-8 rounded-lg border border-gray-300 px-2 text-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <p className="text-sm text-gray-500">Total Pendapatan</p>
            <p className="font-semibold">{formatCurrency(sales.summary.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Pesanan</p>
            <p className="font-semibold">{sales.summary.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rata-rata per Pesanan</p>
            <p className="font-semibold">{formatCurrency(sales.summary.avgOrderValue)}</p>
          </div>
        </div>

        <div className="flex items-end gap-1" style={{ height: 200 }}>
          {sales.chart.slice(-30).map((d, i) => (
            <div key={i} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-primary-500 transition-all hover:bg-primary-600"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: 2 }}
              />
              <div className="mt-1 hidden text-center text-xs text-gray-500 group-hover:block">
                {d.date.slice(5)}
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                <p className="font-medium">{formatCurrency(d.revenue)}</p>
                <p className="text-gray-400">{d.count} pesanan</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Produk Terlaris</h2>
        {dashboard.topProducts.length === 0 ? (
          <p className="text-gray-500">Belum ada data penjualan</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Produk</th>
                <th className="pb-3 font-medium">Harga</th>
                <th className="pb-3 font-medium">Terjual</th>
                <th className="pb-3 font-medium">Pesanan</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.topProducts.map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="py-3">{formatCurrency(p.price)}</td>
                  <td className="py-3">{p.totalSold} unit</td>
                  <td className="py-3">{p.orderCount} pesanan</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
