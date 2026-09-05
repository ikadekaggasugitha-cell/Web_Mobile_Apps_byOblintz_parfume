'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, RotateCcw, FolderTree } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  deletedAt?: string | null;
  _count?: { products: number };
  parent?: { id: string; name: string } | null;
}

type View = 'active' | 'trash';

const categorySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

type CategoryInput = z.infer<typeof categorySchema>;

const DEFAULT_VALUES: CategoryInput = {
  name: '',
  description: '',
  parentId: '',
  sortOrder: 0,
};

export default function AdminCategoriesPage() {
  const { toasts, success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('active');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id: string | null;
    mode: 'soft' | 'permanent';
  }>({ open: false, id: null, mode: 'soft' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const listUrl =
    view === 'trash' ? '/api/categories/admin/all?deleted=true' : '/api/categories/admin/all';

  const refreshCategories = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await api.get(listUrl, { signal });
      setCategories(response.data.data);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Gagal memuat kategori:', error);
      }
    }
  }, [listUrl]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    refreshCategories(controller.signal).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [refreshCategories]);

  const onSubmit = useCallback(async (data: CategoryInput) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        parentId: data.parentId || undefined,
        sortOrder: data.sortOrder ?? 0,
      };

      if (editingCategory) {
        await api.put(`/api/categories/admin/${editingCategory.id}`, payload);
        success('Kategori berhasil diupdate');
      } else {
        await api.post('/api/categories/admin', payload);
        success('Kategori berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingCategory(null);
      reset(DEFAULT_VALUES);
      refreshCategories();
    } catch (error: any) {
      console.error('Gagal simpan:', error);
      showError(error?.response?.data?.error?.message || 'Gagal menyimpan kategori');
    }
  }, [editingCategory, reset, refreshCategories, success, showError]);

  const handleConfirm = useCallback(async () => {
    if (!confirm.id) return;
    try {
      if (confirm.mode === 'permanent') {
        await api.delete(`/api/categories/admin/${confirm.id}/permanent`);
        success('Kategori dihapus permanen');
      } else {
        await api.delete(`/api/categories/admin/${confirm.id}`);
        success('Kategori dipindahkan ke sampah');
      }
      refreshCategories();
    } catch (error: any) {
      console.error('Gagal hapus:', error);
      showError(error?.response?.data?.error?.message || 'Gagal menghapus kategori');
    } finally {
      setConfirm({ open: false, id: null, mode: 'soft' });
    }
  }, [confirm.id, confirm.mode, refreshCategories, success, showError]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await api.post(`/api/categories/admin/${id}/restore`);
      refreshCategories();
      success('Kategori berhasil dipulihkan');
    } catch (error) {
      console.error('Gagal pulihkan:', error);
      showError('Gagal memulihkan kategori');
    }
  }, [refreshCategories, success, showError]);

  const handleOpenModal = useCallback((category?: Category) => {
    if (category) {
      setEditingCategory(category);
      reset({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || '',
        sortOrder: category.sortOrder,
      });
    } else {
      setEditingCategory(null);
      reset(DEFAULT_VALUES);
    }
    setShowModal(true);
  }, [reset]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingCategory(null);
    reset(DEFAULT_VALUES);
  }, [reset]);

  // Parent options: active top-level categories, excluding the one being edited.
  const parentOptions = categories.filter(
    (c) => !c.parentId && c.id !== editingCategory?.id
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ open: false, id: null, mode: 'soft' })}
        title={confirm.mode === 'permanent' ? 'Hapus Permanen Kategori' : 'Pindahkan ke Sampah'}
        message={
          confirm.mode === 'permanent'
            ? 'Kategori akan dihapus permanen dari database dan TIDAK dapat dipulihkan. Lanjutkan?'
            : 'Kategori akan dipindahkan ke Sampah. Anda masih dapat memulihkannya nanti.'
        }
        confirmLabel={confirm.mode === 'permanent' ? 'Hapus Permanen' : 'Pindahkan'}
        variant="danger"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setView('active')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setView('trash')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'trash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Sampah
          </button>
        </div>
        {view === 'active' && (
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Tambah Kategori
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderTree className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {view === 'trash' ? 'Sampah kosong' : 'Tidak ada kategori'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {view === 'trash'
                ? 'Kategori yang dihapus akan muncul di sini.'
                : 'Tambahkan kategori pertama Anda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Nama</th>
                  <th className="th">Induk</th>
                  <th className="th">Produk</th>
                  <th className="th">Urutan</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="transition-colors hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">
                      {category.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">/{category.slug}</span>
                    </td>
                    <td className="td text-slate-600">{category.parent?.name || '-'}</td>
                    <td className="td tabular-nums text-slate-600">{category._count?.products ?? 0}</td>
                    <td className="td tabular-nums text-slate-600">{category.sortOrder}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {view === 'trash' ? (
                          <>
                            <button
                              onClick={() => handleRestore(category.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={2} />
                              Pulihkan
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: category.id, mode: 'permanent' })}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                              Hapus Permanen
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenModal(category)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2} />
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: category.id, mode: 'soft' })}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="category-modal-title" className="mb-4 text-lg font-semibold">
              {editingCategory ? 'Edit Kategori' : 'Kategori Baru'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-slate-700">Nama</label>
                <Input id="category-name" {...register('name')} error={errors.name?.message} />
              </div>
              <div>
                <label htmlFor="category-desc" className="mb-1.5 block text-sm font-medium text-slate-700">Deskripsi (opsional)</label>
                <textarea
                  id="category-desc"
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category-parent" className="mb-1.5 block text-sm font-medium text-slate-700">Induk (opsional)</label>
                  <select id="category-parent" {...register('parentId')} className="input w-full">
                    <option value="">— Tanpa induk —</option>
                    {parentOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="category-sort" className="mb-1.5 block text-sm font-medium text-slate-700">Urutan</label>
                  <Input id="category-sort" type="number" {...register('sortOrder', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
