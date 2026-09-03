'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const faqSchema = z.object({
  question: z.string().min(5, 'Pertanyaan minimal 5 karakter'),
  answer: z.string().min(5, 'Jawaban minimal 5 karakter'),
  category: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean(),
});

type FaqInput = z.infer<typeof faqSchema>;

const DEFAULT_VALUES: FaqInput = {
  question: '',
  answer: '',
  category: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminFaqPage() {
  const { toasts, success, error: showError } = useToast();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FaqInput>({
    resolver: zodResolver(faqSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const refreshFaqs = useCallback(async () => {
    try {
      const response = await api.get('/api/faq/admin/all');
      setFaqs(response.data.data.faqs);
    } catch (error) {
      console.error('Gagal memuat FAQ:', error);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/api/faq/admin/all', {
          signal: controller.signal,
        });
        setFaqs(response.data.data.faqs);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat FAQ:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, []);

  const onSubmit = useCallback(async (data: FaqInput) => {
    try {
      const payload = {
        ...data,
        category: data.category || undefined,
        sortOrder: data.sortOrder ?? 0,
      };

      if (editingFaq) {
        await api.put(`/api/faq/admin/${editingFaq.id}`, payload);
        success('FAQ berhasil diupdate');
      } else {
        await api.post('/api/faq/admin', payload);
        success('FAQ berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingFaq(null);
      reset(DEFAULT_VALUES);
      refreshFaqs();
    } catch (error) {
      console.error('Gagal simpan:', error);
      showError('Gagal menyimpan FAQ');
    }
  }, [editingFaq, reset, refreshFaqs, success, showError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/api/faq/admin/${deleteConfirm.id}`);
      refreshFaqs();
      success('FAQ berhasil dihapus');
    } catch (error) {
      console.error('Gagal hapus:', error);
      showError('Gagal menghapus FAQ');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshFaqs, success, showError]);

  const handleOpenModal = useCallback((faq?: Faq) => {
    if (faq) {
      setEditingFaq(faq);
      reset({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || '',
        sortOrder: faq.sortOrder,
        isActive: faq.isActive,
      });
    } else {
      setEditingFaq(null);
      reset(DEFAULT_VALUES);
    }
    setShowModal(true);
  }, [reset]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingFaq(null);
    reset(DEFAULT_VALUES);
  }, [reset]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        title="Hapus FAQ"
        message="Yakin ingin menghapus FAQ ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + FAQ Baru
        </button>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada FAQ</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="p-4 font-medium">Pertanyaan</th>
                <th className="p-4 font-medium">Kategori</th>
                <th className="p-4 font-medium">Urutan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((faq) => (
                <tr key={faq.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900 max-w-md truncate">{faq.question}</td>
                  <td className="p-4 text-gray-600">{faq.category || '-'}</td>
                  <td className="p-4 text-gray-600">{faq.sortOrder}</td>
                  <td className="p-4">
                    <StatusBadge
                      status={faq.isActive ? 'active' : 'inactive'}
                      labels={{
                        active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
                        inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-800' },
                      }}
                    />
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleOpenModal(faq)} className="text-primary-500 hover:underline">Edit</button>
                    <button onClick={() => setDeleteConfirm({ open: true, id: faq.id })} className="text-red-500 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">{editingFaq ? 'Edit FAQ' : 'FAQ Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Pertanyaan</label>
                <textarea
                  {...register('question')}
                  rows={2}
                  className={`w-full rounded-lg border p-3 text-sm ${errors.question ? 'border-red-500' : 'border-gray-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`}
                />
                {errors.question && <p className="mt-1 text-xs text-red-500">{errors.question.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Jawaban</label>
                <textarea
                  {...register('answer')}
                  rows={5}
                  className={`w-full rounded-lg border p-3 text-sm ${errors.answer ? 'border-red-500' : 'border-gray-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`}
                />
                {errors.answer && <p className="mt-1 text-xs text-red-500">{errors.answer.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Kategori</label>
                  <Input {...register('category')} placeholder="contoh: Pengiriman" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Urutan</label>
                  <Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} className="rounded" />
                <span className="text-sm">Aktif</span>
              </label>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Batal</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50">
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
