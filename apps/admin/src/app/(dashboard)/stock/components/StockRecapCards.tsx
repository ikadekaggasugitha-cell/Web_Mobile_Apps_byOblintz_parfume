'use client';

import { Package, AlertTriangle, Ban, Wallet, type LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StockRecapData {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}

interface StockRecapCardsProps {
  data: StockRecapData;
  isLoading: boolean;
}

const cards: {
  key: keyof StockRecapData;
  label: string;
  icon: LucideIcon;
  tone: string;
  format: (v: number) => string;
  subtitle?: string;
}[] = [
  {
    key: 'totalProducts',
    label: 'Total Produk',
    icon: Package,
    tone: 'bg-blue-50 text-blue-600',
    format: (v: number) => v.toLocaleString('id-ID'),
  },
  {
    key: 'lowStock',
    label: 'Stok Menipis',
    icon: AlertTriangle,
    tone: 'bg-amber-50 text-amber-600',
    format: (v: number) => v.toLocaleString('id-ID'),
    subtitle: '≤ 5 unit',
  },
  {
    key: 'outOfStock',
    label: 'Stok Habis',
    icon: Ban,
    tone: 'bg-red-50 text-red-600',
    format: (v: number) => v.toLocaleString('id-ID'),
  },
  {
    key: 'totalStockValue',
    label: 'Total Nilai Stok',
    icon: Wallet,
    tone: 'bg-emerald-50 text-emerald-600',
    format: (v: number) => formatCurrency(v),
  },
];

export function StockRecapCards({ data, isLoading }: StockRecapCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="card p-5 transition-shadow duration-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                  {isLoading ? '—' : card.format(data[card.key])}
                </p>
                {card.subtitle && (
                  <p className="mt-0.5 text-xs text-slate-400">{card.subtitle}</p>
                )}
              </div>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
