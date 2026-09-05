import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { compactCurrency } from './format';
import type { SalesData } from './types';

export function RevenueChart({ chart }: { chart: SalesData['chart'] }) {
  if (chart.length === 0) {
    return <p className="py-16 text-center text-gray-500">Belum ada data penjualan pada periode ini</p>;
  }

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickMargin={8} />
          <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 11, fill: '#64748b' }} width={56} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), name] as [string, typeof name]}
            labelClassName="font-medium"
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="gross" name="Pendapatan Kotor" stroke="#14b8a6" strokeWidth={2} fill="url(#grossFill)" />
          <Area type="monotone" dataKey="net" name="Pendapatan Bersih" stroke="#10b981" strokeWidth={2} fill="url(#netFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
