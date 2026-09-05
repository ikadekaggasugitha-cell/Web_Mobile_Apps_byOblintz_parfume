'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Pencil, Trash2, Newspaper } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  author: string;
  createdAt: string;
}

const articleSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  content: z.string().min(1, 'Konten wajib diisi'),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

type ArticleInput = z.infer<typeof articleSchema>;

const DEFAULT_VALUES: ArticleInput = {
  title: '',
  content: '',
  excerpt: '',
  status: 'DRAFT',
};

export default function AdminArticlesPage() {
  const { toasts, success, error: showError } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const refreshArticles = useCallback(async () => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/api/articles/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setArticles(response.data.data.articles);
    } catch (error) {
      console.error('Gagal memuat artikel:', error);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('adminAccessToken');
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);

        const response = await api.get(`/api/articles/admin/all?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setArticles(response.data.data.articles);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat artikel:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [statusFilter, search]);

  const onSubmit = useCallback(async (data: ArticleInput) => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      if (editingArticle) {
        await api.put(`/api/articles/admin/${editingArticle.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Artikel berhasil diupdate');
      } else {
        await api.post('/api/articles/admin', data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Artikel berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingArticle(null);
      reset(DEFAULT_VALUES);
      refreshArticles();
    } catch (error) {
      console.error('Gagal simpan:', error);
      showError('Gagal menyimpan artikel');
    }
  }, [editingArticle, reset, refreshArticles, success, showError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;

    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.delete(`/api/articles/admin/${deleteConfirm.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshArticles();
      success('Artikel berhasil dihapus');
    } catch (error) {
      console.error('Gagal hapus:', error);
      showError('Gagal menghapus artikel');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshArticles, success, showError]);

  const handleOpenModal = useCallback((article?: Article) => {
    if (article) {
      setEditingArticle(article);
      reset({
        title: article.title,
        content: '',
        excerpt: article.excerpt || '',
        status: article.status as 'DRAFT' | 'PUBLISHED',
      });
    } else {
      setEditingArticle(null);
      reset(DEFAULT_VALUES);
    }
    setShowModal(true);
  }, [reset]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingArticle(null);
    reset(DEFAULT_VALUES);
  }, [reset]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        title="Hapus Artikel"
        message="Yakin ingin menghapus artikel ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Kelola artikel blog dan konten editorial.</p>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Tambah Artikel
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && refreshArticles()}
            placeholder="Cari artikel..."
            aria-label="Cari artikel"
            className="input w-full pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status"
          className="input sm:w-44"
        >
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Newspaper className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">Tidak ada artikel</p>
            <p className="mt-1 text-sm text-slate-500">
              Coba ubah kata kunci atau filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Judul</th>
                  <th className="th">Penulis</th>
                  <th className="th">Status</th>
                  <th className="th">Tanggal</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((article) => (
                  <tr key={article.id} className="transition-colors hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">{article.title}</td>
                    <td className="td text-slate-600">{article.author}</td>
                    <td className="td">
                      <StatusBadge
                        status={article.status}
                        labels={{
                          PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800' },
                          DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
                        }}
                      />
                    </td>
                    <td className="td tabular-nums text-slate-500">{new Date(article.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(article)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: article.id })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="article-modal-title" className="mb-4 text-lg font-semibold">{editingArticle ? 'Edit Artikel' : 'Artikel Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="article-title" className="mb-1.5 block text-sm font-medium text-slate-700">Judul</label>
                <Input id="article-title" {...register('title')} error={errors.title?.message} />
              </div>
              <div>
                <label htmlFor="article-content" className="mb-1.5 block text-sm font-medium text-slate-700">Konten</label>
                <textarea id="article-content" {...register('content')} className={`h-40 w-full rounded-lg border p-3 text-sm ${errors.content ? 'border-red-500' : 'border-slate-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`} />
                {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>}
              </div>
              <div>
                <label htmlFor="article-excerpt" className="mb-1.5 block text-sm font-medium text-slate-700">Excerpt (opsional)</label>
                <Input id="article-excerpt" {...register('excerpt')} />
              </div>
              <div>
                <label htmlFor="article-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select id="article-status" {...register('status')} className="input w-full">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
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
