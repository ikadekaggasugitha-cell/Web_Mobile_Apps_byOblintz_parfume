'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Pagination } from '@oblintz/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  status: string;
  sku: string;
  category: { name: string };
  _count: { reviews: number; orderItems: number };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  ARCHIVED: { label: 'Arsip', color: 'bg-red-100 text-red-800' },
};

export default function AdminProductsPage() {
  const { toasts, success, error: showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const refreshProducts = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    const token = localStorage.getItem('adminAccessToken');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/api/products/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat produk:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    refreshProducts(1, controller.signal);
    return () => controller.abort();
  }, [refreshProducts]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;

    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.delete(`/api/products/admin/${deleteConfirm.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshProducts();
      success('Produk berhasil dihapus');
    } catch (err) {
      console.error('Gagal menghapus:', err);
      showError('Gagal menghapus produk');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshProducts, success, showError]);

  const handlePageChange = useCallback((page: number) => {
    refreshProducts(page);
  }, [refreshProducts]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        title="Hapus Produk"
        message="Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        <Link
          href="/products/new"
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Tambah Produk
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="h-10 w-full rounded-lg border border-gray-300 px-4 text-sm focus:border-primary-500 focus:outline-none sm:w-64"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-medium hover:bg-gray-200"
          >
            Cari
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Arsip</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Tidak ada produk ditemukan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">SKU</th>
                  <th className="p-4 font-medium">Harga</th>
                  <th className="p-4 font-medium">Stok</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Penjualan</th>
                  <th className="p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.category?.name}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{product.sku}</td>
                    <td className="p-4 font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-medium ${
                          product.stock <= 5 ? 'text-red-500' : 'text-gray-900'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={product.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="p-4 text-gray-600">
                      {product._count.orderItems}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-primary-500 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: product.id })}
                          className="text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t border-gray-200 p-4">
            {paginationPages.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
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
    </div>
  );
}
