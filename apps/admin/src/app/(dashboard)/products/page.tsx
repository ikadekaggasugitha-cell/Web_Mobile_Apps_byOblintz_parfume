'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, PackageSearch } from 'lucide-react';
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Kelola katalog produk, harga, dan stok.
        </p>
        <Link href="/products/new" className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Tambah Produk
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            aria-label="Cari produk"
            className="input w-full pl-9"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status"
          className="input sm:w-44"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Arsip</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <PackageSearch className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Tidak ada produk ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Coba ubah kata kunci atau filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Produk</th>
                  <th className="th">SKU</th>
                  <th className="th">Harga</th>
                  <th className="th">Stok</th>
                  <th className="th">Status</th>
                  <th className="th">Penjualan</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="td">
                      <p className="font-medium text-slate-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.category?.name}
                      </p>
                    </td>
                    <td className="td text-slate-500">{product.sku}</td>
                    <td className="td font-medium tabular-nums text-slate-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="td">
                      <span
                        className={`font-medium tabular-nums ${
                          product.stock <= 5 ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="td">
                      <StatusBadge status={product.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="td tabular-nums text-slate-500">
                      {product._count.orderItems}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: product.id })}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Halaman{' '}
              <span className="font-medium text-slate-700">{pagination.page}</span>{' '}
              dari{' '}
              <span className="font-medium text-slate-700">{pagination.totalPages}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paginationPages.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  aria-current={p === pagination.page ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    p === pagination.page
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
