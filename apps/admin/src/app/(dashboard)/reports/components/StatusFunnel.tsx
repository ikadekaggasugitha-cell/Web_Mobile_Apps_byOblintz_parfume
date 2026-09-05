import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { FunnelData } from './types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  WAITING_PAYMENT: '#f59e0b',
  PAID: '#3b82f6',
  PROCESSING: '#6366f1',
  SHIPPED: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  REFUNDED: '#f43f5e',
};

export function StatusFunnel({ data }: { data: FunnelData }) {
  const rows = data.funnel.filter((f) => f.count > 0);

  if (rows.length === 0) {
    return <p className="py-12 text-center text-gray-500">Belum ada pesanan pada periode ini</p>;
  }

  return (
    <div style={{ width: '100%', height: Math.max(220, rows.length * 44) }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 12, fill: '#334155' }}
          />
          <Tooltip
            formatter={(value: any, _name, item: any) => [
              `${value} pesanan · ${formatCurrency(item?.payload?.amount ?? 0)}`,
              item?.payload?.label,
            ]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
            {rows.map((r) => (
              <Cell key={r.status} fill={STATUS_COLORS[r.status] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
