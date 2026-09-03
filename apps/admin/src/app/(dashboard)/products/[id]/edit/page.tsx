'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductForm } from '@/components/admin/ProductForm';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string;
  weight: number | null;
  categoryId: string;
  notes: { top: string[]; middle: string[]; base: string[] } | null;
  occasions: string[];
  status: string;
  images: string[];
  metaTitle: string;
  metaDesc: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/api/products/admin/${params.id}`);
        const data = response.data.data;
        setProduct({
          id: data.id,
          name: data.name,
          description: data.description || '',
          price: Number(data.price),
          comparePrice: data.comparePrice ? Number(data.comparePrice) : null,
          stock: data.stock,
          sku: data.sku || '',
          weight: data.weight ? Number(data.weight) : null,
          categoryId: data.categoryId || '',
          notes: data.notes || null,
          occasions: data.occasions || [],
          status: data.status,
          images: data.images || [],
          metaTitle: data.metaTitle || '',
          metaDesc: data.metaDesc || '',
        });
      } catch (err: any) {
        console.error('Gagal memuat produk:', err);
        setError('Gagal memuat data produk');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Memuat data produk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4 text-red-500">{error}</p>
        <button
          onClick={() => router.push('/products')}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
        >
          Kembali ke Produk
        </button>
      </div>
    );
  }

  if (!product) return null;

  return <ProductForm mode="edit" initialData={product} />;
}
