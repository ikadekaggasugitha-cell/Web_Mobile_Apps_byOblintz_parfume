import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { ProductReportData } from './types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b'];

export function CategoryDonut({ data }: { data: ProductReportData['byCategory'] }) {
  const rows = data.filter((d) => d.revenue > 0);

  if (rows.length === 0) {
    return <p className="py-16 text-center text-gray-500">Belum ada penjualan pada periode ini</p>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={rows}
            dataKey="revenue"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
          >
            {rows.map((r, i) => (
              <Cell key={r.categoryId ?? i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, _n, item: any) => [
              `${formatCurrency(Number(value))} · ${item?.payload?.qty ?? 0} unit`,
              item?.payload?.name,
            ]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
