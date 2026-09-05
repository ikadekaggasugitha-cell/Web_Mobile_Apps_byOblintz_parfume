import { formatCurrency } from '@/lib/utils';
import { RevenueChart } from './RevenueChart';
import { StatusFunnel } from './StatusFunnel';
import type { SalesData, FunnelData } from './types';

function SummaryCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-semibold ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

export function PenjualanTab({
  sales,
  funnel,
}: {
  sales: SalesData | null;
  funnel: FunnelData | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ringkasan Penjualan</h2>
        {sales ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCell label="Pendapatan Kotor" value={formatCurrency(sales.summary.totalGross)} />
              <SummaryCell label="Total Diskon" value={`-${formatCurrency(sales.summary.totalDiscount)}`} tone="text-rose-600" />
              <SummaryCell label="Pendapatan Bersih" value={formatCurrency(sales.summary.totalNet)} tone="text-emerald-600" />
              <SummaryCell label="Total Diterima" value={formatCurrency(sales.summary.totalRevenue)} />
              <SummaryCell label="Total Pesanan" value={String(sales.summary.totalOrders)} />
              <SummaryCell label="Rata-rata / Pesanan" value={formatCurrency(sales.summary.avgOrderValue)} />
            </div>
            <RevenueChart chart={sales.chart} />
          </>
        ) : (
          <p className="py-16 text-center text-gray-500">Memuat grafik...</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Status Pesanan</h2>
          {funnel && <span className="text-sm text-gray-500">{funnel.totalOrders} pesanan</span>}
        </div>
        {funnel ? <StatusFunnel data={funnel} /> : <p className="py-12 text-center text-gray-500">Memuat...</p>}
      </div>
    </div>
  );
}
