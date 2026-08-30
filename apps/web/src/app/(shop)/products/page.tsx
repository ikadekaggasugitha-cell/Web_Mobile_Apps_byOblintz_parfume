'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingPage } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  category?: { name: string };
  _count?: { reviews: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'name', label: 'Nama A-Z' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort,
      });
      if (search) params.set('search', search);

      const response = await api.get(`/api/products?${params}`, { signal });
      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat produk:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(1, controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  const handlePageChange = useCallback((page: number) => {
    fetchProducts(page);
  }, [fetchProducts]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
      .filter(
        (p) =>
          p === 1 ||
          p === pagination.totalPages ||
          Math.abs(p - pagination.page) <= 2
      );
  }, [pagination]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {/* Header */}
      <PageHeader
        eyebrow="Katalog"
        title="Koleksi Parfum"
        description="Temukan parfum original premium yang menuturkan kisah Anda — dari nuansa segar hingga aroma hangat yang mendalam."
      />

      {/* Filters */}
      <div className="mb-8 mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari parfum..."
            className="h-11 w-full rounded-[10px] border border-line bg-white px-4 text-sm text-espresso placeholder:text-warmgray/60 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/25 sm:w-64"
          />
          <Button type="submit" size="sm">
            Cari
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-luxe text-warmgray">Urutkan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm text-espresso focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <LoadingPage />
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-xl italic text-warmgray">
            Tidak ada parfum ditemukan
          </p>
          <p className="mt-2 text-sm text-warmgray/80">
            Coba kata kunci lain atau jelajahi seluruh koleksi kami.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {paginationPages.map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-2 text-warmgray/60">…</span>
                  )}
                  <Button
                    variant={p === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
