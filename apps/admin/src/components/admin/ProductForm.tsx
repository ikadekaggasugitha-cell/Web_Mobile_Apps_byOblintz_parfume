'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductData {
  id?: string;
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

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  description: z.string().optional(),
  price: z.number().positive('Harga harus lebih dari 0'),
  comparePrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
  sku: z.string().optional(),
  weight: z.number().positive().optional().nullable(),
  categoryId: z.string().optional(),
  notesTop: z.string().optional(),
  notesMiddle: z.string().optional(),
  notesBase: z.string().optional(),
  occasions: z.string().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']),
  images: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

type ProductFormInput = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: ProductData;
  mode: 'create' | 'edit';
}

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      comparePrice: initialData?.comparePrice || null,
      stock: initialData?.stock || 0,
      sku: initialData?.sku || '',
      weight: initialData?.weight || null,
      categoryId: initialData?.categoryId || '',
      notesTop: initialData?.notes?.top?.join(', ') || '',
      notesMiddle: initialData?.notes?.middle?.join(', ') || '',
      notesBase: initialData?.notes?.base?.join(', ') || '',
      occasions: initialData?.occasions?.join(', ') || '',
      status: (initialData?.status as any) || 'DRAFT',
      images: initialData?.images?.join('\n') || '',
      metaTitle: initialData?.metaTitle || '',
      metaDesc: initialData?.metaDesc || '',
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/categories/admin/all');
        setCategories(response.data.data);
      } catch (error) {
        console.error('Gagal memuat kategori:', error);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = useCallback(async (data: ProductFormInput) => {
    setIsSubmitting(true);
    const notes = {
      top: data.notesTop ? data.notesTop.split(',').map((s) => s.trim()).filter(Boolean) : [],
      middle: data.notesMiddle ? data.notesMiddle.split(',').map((s) => s.trim()).filter(Boolean) : [],
      base: data.notesBase ? data.notesBase.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    const payload = {
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      comparePrice: data.comparePrice || undefined,
      stock: data.stock,
      sku: data.sku || undefined,
      weight: data.weight || undefined,
      categoryId: data.categoryId || undefined,
      notes: notes.top.length || notes.middle.length || notes.base.length ? notes : undefined,
      occasions: data.occasions ? data.occasions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      status: data.status,
      images: data.images ? data.images.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      metaTitle: data.metaTitle || undefined,
      metaDesc: data.metaDesc || undefined,
    };

    try {
      if (mode === 'edit' && initialData?.id) {
        await api.put(`/api/products/admin/${initialData.id}`, payload);
        success('Produk berhasil diupdate');
      } else {
        await api.post('/api/products/admin', payload);
        success('Produk berhasil ditambahkan');
      }
      router.push('/products');
    } catch (err: any) {
      showError(err.response?.data?.error?.message || 'Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
    }
  }, [initialData, mode, router, success, showError]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Tambah Produk' : 'Edit Produk'}
        </h1>
        <button
          onClick={() => router.push('/products')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Kembali
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Informasi Dasar</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama Produk *</label>
              <Input {...register('name')} error={errors.name?.message} placeholder="Nama produk" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Deskripsi produk"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Harga (Rp) *</label>
                <Input type="number" step="0.01" {...register('price', { valueAsNumber: true })} error={errors.price?.message} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Harga Coret (Rp)</label>
                <Input type="number" step="0.01" {...register('comparePrice', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Stok *</label>
                <Input type="number" {...register('stock', { valueAsNumber: true })} error={errors.stock?.message} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">SKU</label>
                <Input {...register('sku')} placeholder="SKU-001" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Berat (gram)</label>
                <Input type="number" step="0.01" {...register('weight', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Kategori</label>
                <select {...register('categoryId')} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none">
                  <option value="">Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Status *</label>
                <select {...register('status')} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none">
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Perfume Notes */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Catatan Parfum</h2>
          <p className="mb-4 text-sm text-gray-500">Pisahkan dengan koma. Contoh: Rose, Jasmine, Lily</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Top Notes</label>
              <Input {...register('notesTop')} placeholder="Citrus, Bergamot, Pear" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Middle Notes</label>
              <Input {...register('notesMiddle')} placeholder="Rose, Jasmine, Peony" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Base Notes</label>
              <Input {...register('notesBase')} placeholder="Sandalwood, Musk, Vanilla" />
            </div>
          </div>
        </div>

        {/* Occasions & Images */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Lainnya</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Occasions</label>
              <Input {...register('occasions')} placeholder="Romantic, Casual, Formal" />
              <p className="mt-1 text-xs text-gray-500">Pisahkan dengan koma</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">URL Gambar</label>
              <textarea
                {...register('images')}
                rows={3}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Satu URL per baris"
              />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Meta Title</label>
              <Input {...register('metaTitle')} placeholder="Judul SEO" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Meta Description</label>
              <textarea
                {...register('metaDesc')}
                rows={2}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Deskripsi SEO"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : mode === 'create' ? 'Tambah Produk' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
