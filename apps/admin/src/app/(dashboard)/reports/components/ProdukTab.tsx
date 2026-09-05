import { Package, PackageCheck, AlertTriangle, PackageX } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from './StatCard';
import { CategoryDonut } from './CategoryDonut';
import type { ProductReportData } from './types';

export function ProdukTab({ data }: { data: ProductReportData | null }) {
  if (!data) return <p className="py-16 text-center text-gray-500">Memuat data produk...</p>;

  const s = data.stats;
  const cards = [
    { title: 'Total Produk', value: s.totalProducts, icon: Package, tone: 'bg-slate-100 text-slate-600' },
    { title: 'Produk Aktif', value: s.activeProducts, icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Stok Menipis', value: s.lowStock, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
    { title: 'Stok Habis', value: s.outOfStock, icon: PackageX, tone: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Pendapatan per Kategori</h2>
          <CategoryDonut data={data.byCategory} />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Produk Terlaris (Pendapatan)</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-500">Belum ada data penjualan</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Produk</th>
                    <th className="pb-3 text-right font-medium">Pendapatan</th>
                    <th className="pb-3 text-right font-medium">Terjual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.productId} className="border-b border-gray-100">
                      <td className="py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                      <td className="py-2.5 text-right tabular-nums">{p.qty} unit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
