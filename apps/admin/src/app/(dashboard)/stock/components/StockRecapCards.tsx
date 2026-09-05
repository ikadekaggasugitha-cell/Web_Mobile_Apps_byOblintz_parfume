'use client';

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

const cards = [
  {
    key: 'totalProducts' as const,
    label: 'Total Produk',
    icon: '📦',
    color: 'bg-blue-500',
    format: (v: number) => v.toLocaleString('id-ID'),
  },
  {
    key: 'lowStock' as const,
    label: 'Stok Menipis',
    icon: '⚠️',
    color: 'bg-yellow-500',
    format: (v: number) => v.toLocaleString('id-ID'),
    subtitle: '≤ 5 unit',
  },
  {
    key: 'outOfStock' as const,
    label: 'Stok Habis',
    icon: '🚫',
    color: 'bg-red-500',
    format: (v: number) => v.toLocaleString('id-ID'),
  },
  {
    key: 'totalStockValue' as const,
    label: 'Total Nilai Stok',
    icon: '💰',
    color: 'bg-green-500',
    format: (v: number) => formatCurrency(v),
  },
];

export function StockRecapCards({ data, isLoading }: StockRecapCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {isLoading ? '...' : card.format(data[card.key])}
              </p>
              {card.subtitle && (
                <p className="text-xs text-gray-400">{card.subtitle}</p>
              )}
            </div>
            <div
              className={`${card.color} flex h-12 w-12 items-center justify-center rounded-lg text-2xl`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
