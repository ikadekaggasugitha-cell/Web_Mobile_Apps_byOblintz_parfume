'use client';

import type { Pagination } from '@oblintz/shared';

interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string } | null;
}

interface StockMovementTableProps {
  movements: StockMovement[];
  pagination: Pagination | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ORDER: { label: 'Pesanan', color: 'bg-red-100 text-red-800' },
  CANCEL: { label: 'Pembatalan', color: 'bg-green-100 text-green-800' },
  RESTOCK: { label: 'Restock', color: 'bg-blue-100 text-blue-800' },
  ADJUSTMENT: { label: 'Penyesuaian', color: 'bg-yellow-100 text-yellow-800' },
  RETURN: { label: 'Retur', color: 'bg-purple-100 text-purple-800' },
};

export function StockMovementTable({
  movements,
  pagination,
  isLoading,
  onPageChange,
}: StockMovementTableProps) {
  const paginationPages = pagination
    ? Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
    : [];

  return (
    <div className="rounded-xl bg-white shadow-sm">
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Memuat...</div>
      ) : movements.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Tidak ada riwayat pergerakan stok
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Produk</th>
                <th className="p-4 font-medium">Tipe</th>
                <th className="p-4 font-medium">Quantity</th>
                <th className="p-4 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const typeInfo = TYPE_LABELS[movement.type] || {
                  label: movement.type,
                  color: 'bg-gray-100 text-gray-800',
                };
                const isPositive = movement.quantity > 0;

                return (
                  <tr
                    key={movement.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-4 text-gray-600">
                      {new Date(movement.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {movement.product?.name || '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movement.product?.sku || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-medium ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {movement.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 max-w-[200px] truncate">
                      {movement.note || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 border-t border-gray-200 p-4">
          {paginationPages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 rounded-lg px-3 text-sm ${
                p === pagination.page
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
