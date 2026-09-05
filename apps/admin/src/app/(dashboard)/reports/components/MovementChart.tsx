import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { InventoryReportData } from './types';

export function MovementChart({ series }: { series: InventoryReportData['series'] }) {
  if (series.length === 0) {
    return <p className="py-16 text-center text-gray-500">Belum ada pergerakan stok pada periode ini</p>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickMargin={8} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={40} />
          <Tooltip
            formatter={(value: any, name) => [`${value} unit`, name] as [string, typeof name]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="masuk" name="Masuk" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="keluar" name="Keluar" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
