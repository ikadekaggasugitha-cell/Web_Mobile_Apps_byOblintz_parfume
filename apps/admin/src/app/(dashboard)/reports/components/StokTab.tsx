import { PackageCheck, AlertTriangle, PackageX, Warehouse } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from './StatCard';
import { MovementChart } from './MovementChart';
import type { InventoryReportData } from './types';

const TYPE_LABELS: Record<string, string> = {
  ORDER: 'Pesanan',
  CANCEL: 'Pembatalan',
  RESTOCK: 'Restok',
  ADJUSTMENT: 'Penyesuaian',
  RETURN: 'Retur',
};

export function StokTab({ data }: { data: InventoryReportData | null }) {
  if (!data) return <p className="py-16 text-center text-gray-500">Memuat data stok...</p>;

  const r = data.recap;
  const cards = [
    { title: 'Nilai Inventaris', value: formatCurrency(r.inventoryValue), icon: Warehouse, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Produk Aktif', value: r.activeProducts, icon: PackageCheck, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Stok Menipis', value: r.lowStock, icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600' },
    { title: 'Stok Habis', value: r.outOfStock, icon: PackageX, tone: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Pergerakan Stok</h2>
        <MovementChart series={data.series} />
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ringkasan per Jenis Pergerakan</h2>
        {data.byType.length === 0 ? (
          <p className="text-gray-500">Belum ada pergerakan stok pada periode ini</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Jenis</th>
                  <th className="pb-3 text-right font-medium">Jumlah Transaksi</th>
                  <th className="pb-3 text-right font-medium">Perubahan Netto</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.map((t) => (
                  <tr key={t.type} className="border-b border-gray-100">
                    <td className="py-2.5 font-medium text-gray-900">{TYPE_LABELS[t.type] ?? t.type}</td>
                    <td className="py-2.5 text-right tabular-nums">{t.count}</td>
                    <td className={`py-2.5 text-right tabular-nums font-medium ${t.netQty >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.netQty > 0 ? `+${t.netQty}` : t.netQty} unit
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
