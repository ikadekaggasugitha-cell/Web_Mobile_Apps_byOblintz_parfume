import { Users, UserPlus, UserCheck, Percent } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from './StatCard';
import type { CustomerReportData } from './types';

const SUB_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  PAUSED: 'Dijeda',
  CANCELLED: 'Dibatalkan',
  EXPIRED: 'Kadaluarsa',
};

export function PelangganTab({ data }: { data: CustomerReportData | null }) {
  if (!data) return <p className="py-16 text-center text-gray-500">Memuat data pelanggan...</p>;

  const s = data.stats;
  const cards = [
    { title: 'Total Pengguna', value: s.totalUsers, icon: Users, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Pelanggan Baru', value: s.newCustomers, icon: UserPlus, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Pelanggan Kembali', value: s.returningCustomers, icon: UserCheck, tone: 'bg-violet-50 text-violet-600' },
    { title: 'Konversi Pembeli', value: `${s.conversionRate.toFixed(1)}%`, icon: Percent, tone: 'bg-amber-50 text-amber-600' },
  ];

  const nvr = [
    { name: 'Pelanggan Baru', value: s.newCustomers, fill: '#10b981' },
    { name: 'Pelanggan Kembali', value: s.returningCustomers, fill: '#8b5cf6' },
  ].filter((d) => d.value > 0);

  const subs = Object.entries(data.subscriptionsByStatus);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Baru vs Kembali</h2>
          {nvr.length === 0 ? (
            <p className="py-16 text-center text-gray-500">Belum ada pembeli pada periode ini</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={nvr} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={2}>
                    {nvr.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, _n, item: any) => [`${value} pelanggan`, item?.payload?.name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Langganan</h2>
          {subs.length === 0 ? (
            <p className="text-gray-500">Belum ada langganan</p>
          ) : (
            <div className="space-y-3">
              {subs.map(([status, val]) => (
                <div key={status} className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-600">{SUB_LABELS[status] ?? status}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Pelanggan Teratas (Belanja)</h2>
        {data.topCustomers.length === 0 ? (
          <p className="text-gray-500">Belum ada data belanja</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Pelanggan</th>
                  <th className="pb-3 text-right font-medium">Total Belanja</th>
                  <th className="pb-3 text-right font-medium">Pesanan</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c) => (
                  <tr key={c.userId} className="border-b border-gray-100">
                    <td className="py-2.5">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrency(c.spend)}</td>
                    <td className="py-2.5 text-right tabular-nums">{c.orderCount}</td>
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
