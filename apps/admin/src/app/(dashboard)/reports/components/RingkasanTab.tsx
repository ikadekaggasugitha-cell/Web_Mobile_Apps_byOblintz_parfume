import {
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Repeat,
  TrendingUp,
  Coins,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from './StatCard';
import { RevenueChart } from './RevenueChart';
import type { DashboardData, SalesData } from './types';

export function RingkasanTab({
  dashboard,
  sales,
}: {
  dashboard: DashboardData;
  sales: SalesData | null;
}) {
  const s = dashboard.stats;
  const cards: { title: string; value: string | number; icon: LucideIcon; tone: string }[] = [
    { title: 'Pendapatan Bersih Bulan Ini', value: formatCurrency(s.netRevenueThisMonth), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Pendapatan Kotor Bulan Ini', value: formatCurrency(s.grossRevenueThisMonth), icon: Coins, tone: 'bg-teal-50 text-teal-600' },
    { title: 'Total Diskon Bulan Ini', value: formatCurrency(s.discountThisMonth), icon: Receipt, tone: 'bg-rose-50 text-rose-600' },
    { title: 'Rata-rata per Pesanan', value: formatCurrency(s.avgOrderValue), icon: TrendingUp, tone: 'bg-pink-50 text-pink-600' },
    { title: 'Pesanan Bulan Ini', value: s.ordersThisMonth, icon: ShoppingCart, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Total Pesanan', value: s.totalOrders, icon: ShoppingCart, tone: 'bg-indigo-50 text-indigo-600' },
    { title: 'Produk Aktif', value: s.totalProducts, icon: Package, tone: 'bg-violet-50 text-violet-600' },
    { title: 'Total Pengguna', value: s.totalUsers, icon: Users, tone: 'bg-amber-50 text-amber-600' },
    { title: 'Langganan Aktif', value: s.totalSubscriptions, icon: Repeat, tone: 'bg-cyan-50 text-cyan-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Tren Penjualan</h2>
        {sales ? <RevenueChart chart={sales.chart} /> : <p className="py-16 text-center text-gray-500">Memuat grafik...</p>}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Produk Terlaris</h2>
        {dashboard.topProducts.length === 0 ? (
          <p className="text-gray-500">Belum ada data penjualan</p>
        ) : (
          <div className="overflow-x-auto">
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
          </div>
        )}
      </div>
    </div>
  );
}
