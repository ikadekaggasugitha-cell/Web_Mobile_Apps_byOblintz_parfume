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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Artikel</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Artikel Baru
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && refreshArticles()}
          placeholder="Cari artikel..."
          className="h-10 w-64 rounded-lg border border-gray-300 px-4 text-sm focus:border-primary-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada artikel</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="p-4 font-medium">Judul</th>
                <th className="p-4 font-medium">Penulis</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{article.title}</td>
                  <td className="p-4 text-gray-600">{article.author}</td>
                  <td className="p-4">
                    <StatusBadge
                      status={article.status}
                      labels={{
                        PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800' },
                        DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
                      }}
                    />
                  </td>
                  <td className="p-4 text-gray-500">{new Date(article.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleOpenModal(article)} className="text-primary-500 hover:underline">Edit</button>
                    <button onClick={() => setDeleteConfirm({ open: true, id: article.id })} className="text-red-500 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="article-modal-title">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6">
            <h2 id="article-modal-title" className="mb-4 text-lg font-semibold">{editingArticle ? 'Edit Artikel' : 'Artikel Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="article-title" className="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
                <Input id="article-title" {...register('title')} error={errors.title?.message} />
              </div>
              <div>
                <label htmlFor="article-content" className="mb-1.5 block text-sm font-medium text-gray-700">Konten</label>
                <textarea id="article-content" {...register('content')} className={`h-40 w-full rounded-lg border p-3 text-sm ${errors.content ? 'border-red-500' : 'border-gray-300'} focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500`} />
                {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>}
              </div>
              <div>
                <label htmlFor="article-excerpt" className="mb-1.5 block text-sm font-medium text-gray-700">Excerpt (opsional)</label>
                <Input id="article-excerpt" {...register('excerpt')} />
              </div>
              <div>
                <label htmlFor="article-status" className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select id="article-status" {...register('status')} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
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
