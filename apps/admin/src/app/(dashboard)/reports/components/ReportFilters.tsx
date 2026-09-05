import type { Period } from './types';

export interface ReportFiltersProps {
  period: Period;
  startDate: string;
  endDate: string;
  showPeriod?: boolean;
  onPeriodChange: (p: Period) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

const PRESETS: { label: string; days: number }[] = [
  { label: '7 hari', days: 7 },
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
];

function toInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ReportFilters({
  period,
  startDate,
  endDate,
  showPeriod = true,
  onPeriodChange,
  onStartChange,
  onEndChange,
}: ReportFiltersProps) {
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onStartChange(toInput(start));
    onEndChange(toInput(end));
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Dari</label>
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Sampai</label>
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => onEndChange(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 px-2 text-sm"
        />
      </div>

      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {showPeriod && (
        <div className="ml-auto flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Granularitas</label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as Period)}
            className="h-9 rounded-lg border border-gray-300 px-2 text-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>
      )}
    </div>
  );
}
