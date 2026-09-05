'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Kelola pertanyaan yang sering diajukan.</p>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Tambah FAQ
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <HelpCircle className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">Tidak ada FAQ</p>
            <p className="mt-1 text-sm text-slate-500">Tambahkan pertanyaan pertama Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Pertanyaan</th>
                  <th className="th">Kategori</th>
                  <th className="th">Urutan</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="transition-colors hover:bg-slate-50">
                    <td className="td max-w-md truncate font-medium text-slate-900">{faq.question}</td>
                    <td className="td text-slate-600">{faq.category || '-'}</td>
                    <td className="td tabular-nums text-slate-600">{faq.sortOrder}</td>
                    <td className="td">
                      <StatusBadge
                        status={faq.isActive ? 'active' : 'inactive'}
                        labels={{
                          active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
                          inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-800' },
                        }}
                      />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(faq)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: faq.id })}
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
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">{editingFaq ? 'Edit FAQ' : 'FAQ Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Pertanyaan</label>
                <textarea
                  {...register('question')}
                  rows={2}
                  className={`w-full rounded-lg border p-3 text-sm ${errors.question ? 'border-red-500' : 'border-slate-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`}
                />
                {errors.question && <p className="mt-1 text-xs text-red-500">{errors.question.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Jawaban</label>
                <textarea
                  {...register('answer')}
                  rows={5}
                  className={`w-full rounded-lg border p-3 text-sm ${errors.answer ? 'border-red-500' : 'border-slate-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`}
                />
                {errors.answer && <p className="mt-1 text-xs text-red-500">{errors.answer.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Kategori</label>
                  <input {...register('category')} placeholder="contoh: Pengiriman" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Urutan</label>
                  <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="input w-full" />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} className="rounded border-slate-300" />
                <span className="text-sm">Aktif</span>
              </label>
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
