'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { StockRecapCards } from './components/StockRecapCards';
import { StockMovementTable } from './components/StockMovementTable';
import { StockAdjustmentDialog } from './components/StockAdjustmentDialog';

interface StockRecapData {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StockRecapPage() {
  const [recap, setRecap] = useState<StockRecapData>({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalStockValue: 0,
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoadingRecap, setIsLoadingRecap] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const fetchRecap = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) return;

    try {
      const response = await api.get('/api/stock/recap', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setRecap(response.data.data);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat rekap stok:', err);
      }
    } finally {
      setIsLoadingRecap(false);
    }
  }, []);

  const fetchMovements = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      setIsLoadingMovements(true);
      const token = localStorage.getItem('adminAccessToken');
      if (!token) return;

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });

        const response = await api.get(`/api/stock/movements?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        setMovements(response.data.data.movements);
        setPagination(response.data.data.pagination);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal memuat riwayat stok:', err);
        }
      } finally {
        setIsLoadingMovements(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchRecap(controller.signal);
    fetchMovements(1, controller.signal);
    return () => controller.abort();
  }, [fetchRecap, fetchMovements]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchMovements(page);
    },
    [fetchMovements]
  );

  const handleAdjustmentSuccess = useCallback(() => {
    fetchRecap();
    fetchMovements(1);
  }, [fetchRecap, fetchMovements]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rekap Stok</h1>
        <button
          onClick={() => setAdjustmentOpen(true)}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Penyesuaian Stok
        </button>
      </div>

      <StockRecapCards data={recap} isLoading={isLoadingRecap} />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Riwayat Pergerakan Stok
        </h2>
        <StockMovementTable
          movements={movements}
          pagination={pagination}
          isLoading={isLoadingMovements}
          onPageChange={handlePageChange}
        />
      </div>

      <StockAdjustmentDialog
        isOpen={adjustmentOpen}
        onClose={() => setAdjustmentOpen(false)}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}
