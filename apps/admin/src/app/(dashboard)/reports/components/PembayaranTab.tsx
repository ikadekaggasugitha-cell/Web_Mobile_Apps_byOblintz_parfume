import { Wallet, Receipt, Landmark, Ticket } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from './StatCard';
import type { PaymentReportData, PromoReportData } from './types';

const METHOD_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const PAY_STATUS_LABELS: Record<string, string> = {
  PAID: 'Berhasil',
  PENDING: 'Menunggu',
  FAILED: 'Gagal',
  EXPIRED: 'Kadaluarsa',
  REFUNDED: 'Dikembalikan',
};

const PROMO_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Persen',
  FIXED: 'Nominal',
  FREE_SHIPPING: 'Gratis Ongkir',
};

export function PembayaranTab({
  payment,
  promo,
}: {
  payment: PaymentReportData | null;
  promo: PromoReportData | null;
}) {
  if (!payment || !promo) return <p className="py-16 text-center text-gray-500">Memuat data pembayaran...</p>;

  const cards = [
    { title: 'Total Diterima (Bruto)', value: formatCurrency(payment.summary.totalPaid), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Biaya Payment Gateway', value: formatCurrency(payment.summary.totalFee), icon: Receipt, tone: 'bg-rose-50 text-rose-600' },
    { title: 'Diterima Bersih', value: formatCurrency(payment.summary.netReceived), icon: Landmark, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Diskon Promo', value: formatCurrency(promo.summary.totalDiscountGiven), icon: Ticket, tone: 'bg-amber-50 text-amber-600' },
  ];

  const methodPie = payment.byMethod.filter((m) => m.amount > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Metode Pembayaran</h2>
          {methodPie.length === 0 ? (
            <p className="py-16 text-center text-gray-500">Belum ada pembayaran berhasil pada periode ini</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={methodPie} dataKey="amount" nameKey="method" innerRadius={65} outerRadius={105} paddingAngle={2}>
                    {methodPie.map((m, i) => (
                      <Cell key={m.method} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _n, item: any) => [formatCurrency(Number(value)), item?.payload?.method]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Status Transaksi</h2>
          {payment.byStatus.length === 0 ? (
            <p className="text-gray-500">Belum ada transaksi pada periode ini</p>
          ) : (
            <div className="space-y-3">
              {payment.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-600">{PAY_STATUS_LABELS[s.status] ?? s.status}</span>
                  <span className="text-sm tabular-nums text-gray-500">
                    {s.count}× · <span className="font-semibold text-gray-900">{formatCurrency(s.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Rincian Metode & Biaya</h2>
        <p className="mb-4 text-sm text-gray-500">Hanya transaksi berhasil</p>
        {payment.byMethod.length === 0 ? (
          <p className="text-gray-500">Belum ada data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Metode</th>
                  <th className="pb-3 text-right font-medium">Transaksi</th>
                  <th className="pb-3 text-right font-medium">Bruto</th>
                  <th className="pb-3 text-right font-medium">Biaya</th>
                  <th className="pb-3 text-right font-medium">Bersih</th>
                </tr>
              </thead>
              <tbody>
                {payment.byMethod.map((m) => (
                  <tr key={m.method} className="border-b border-gray-100">
                    <td className="py-2.5 font-medium text-gray-900">{m.method}</td>
                    <td className="py-2.5 text-right tabular-nums">{m.count}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(m.amount)}</td>
                    <td className="py-2.5 text-right tabular-nums text-rose-600">-{formatCurrency(m.fee)}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Efektivitas Promo</h2>
          <span className="text-sm text-gray-500">
            {promo.summary.totalOrdersWithPromo} pesanan · diskon {formatCurrency(promo.summary.totalDiscountGiven)} · pendapatan {formatCurrency(promo.summary.revenueFromPromo)}
          </span>
        </div>
        {promo.promos.length === 0 ? (
          <p className="text-gray-500">Belum ada promo yang dipakai pada periode ini</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Kode</th>
                  <th className="pb-3 font-medium">Jenis</th>
                  <th className="pb-3 text-right font-medium">Dipakai (Periode)</th>
                  <th className="pb-3 text-right font-medium">Total Diskon</th>
                  <th className="pb-3 text-right font-medium">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {promo.promos.map((p) => (
                  <tr key={p.promoCodeId ?? p.code} className="border-b border-gray-100">
                    <td className="py-2.5 font-medium text-gray-900">{p.code}</td>
                    <td className="py-2.5 text-gray-600">{PROMO_TYPE_LABELS[p.type] ?? p.type}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {p.ordersCount}
                      {p.usageLimit !== null && <span className="text-gray-400"> / {p.usageLimit}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-rose-600">-{formatCurrency(p.totalDiscount)}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(p.revenue)}</td>
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
