'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface StockAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ADJUSTMENT_TYPES = [
  { value: 'RESTOCK', label: 'Restock (Tambah Stok)' },
  { value: 'ADJUSTMENT', label: 'Penyesuaian (Kurangi Stok)' },
  { value: 'RETURN', label: 'Retur (Tambah Stok)' },
] as const;

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<string>('RESTOCK');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSubmitting(true);

      const token = localStorage.getItem('adminAccessToken');

      try {
        await api.post(
          '/api/stock/adjustment',
          {
            productId,
            quantity: parseInt(quantity, 10),
            type,
            note: note || undefined,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProductId('');
        setQuantity('');
        setType('RESTOCK');
        setNote('');
        onSuccess();
        onClose();
      } catch (err: any) {
        const message =
          err?.response?.data?.error?.message || 'Gagal menyesuaikan stok';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [productId, quantity, type, note, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Penyesuaian Stok
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Tambah atau kurangi stok produk secara manual
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product ID
            </label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="UUID produk"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipe
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              placeholder="Jumlah unit"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Catatan (Opsional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Alasan penyesuaian stok..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
