'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from './SectionHeading';

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

const SKELETON_COUNT = 4;

export function Bestsellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await api.get('/api/products?sort=popular&limit=4', {
          signal: controller.signal,
        });
        setProducts(response.data.data.products ?? []);
      } catch (err: any) {
        if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Hide the whole section if it genuinely has nothing to show
  if (!isLoading && (hasError || products.length === 0)) {
    return null;
  }

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow="Paling Diminati"
            title="Favorit Pelanggan Kami"
          />
          <Link
            href="/products"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            Lihat Semua Produk
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="animate-pulse" aria-hidden="true">
                  <div className="aspect-square rounded-xl bg-stone-100" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-stone-100" />
                    <div className="h-4 w-3/4 rounded bg-stone-100" />
                    <div className="h-4 w-1/2 rounded bg-stone-100" />
                  </div>
                </div>
              ))
            : products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </div>
    </section>
  );
}
