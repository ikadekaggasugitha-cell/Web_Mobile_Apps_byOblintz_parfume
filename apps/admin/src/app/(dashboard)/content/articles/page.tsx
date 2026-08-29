'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  author: string;
  createdAt: string;
}

const INITIAL_FORM = { title: '', content: '', excerpt: '', status: 'DRAFT' };

export default function AdminArticlesPage() {
  const { toasts, success, error: showError } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
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

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Judul wajib diisi';
    if (!form.content.trim()) errors.content = 'Konten wajib diisi';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem('adminAccessToken');
    try {
      if (editingArticle) {
        await api.put(`/api/articles/admin/${editingArticle.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Artikel berhasil diupdate');
      } else {
        await api.post('/api/articles/admin', form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Artikel berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingArticle(null);
      setForm(INITIAL_FORM);
      refreshArticles();
    } catch (error) {
      console.error('Gagal simpan:', error);
      showError('Gagal menyimpan artikel');
    }
  }, [editingArticle, form, validateForm, refreshArticles, success, showError]);

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
      setForm({ title: article.title, content: '', excerpt: article.excerpt || '', status: article.status });
    } else {
      setEditingArticle(null);
      setForm(INITIAL_FORM);
    }
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingArticle(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
  }, []);

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
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${article.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {article.status}
                    </span>
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
            <div className="space-y-4">
              <div>
                <label htmlFor="article-title" className="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
                <input id="article-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`h-10 w-full rounded-lg border px-3 text-sm ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`} />
                {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
              </div>
              <div>
                <label htmlFor="article-content" className="mb-1.5 block text-sm font-medium text-gray-700">Konten</label>
                <textarea id="article-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`h-40 w-full rounded-lg border p-3 text-sm ${formErrors.content ? 'border-red-500' : 'border-gray-300'}`} />
                {formErrors.content && <p className="mt-1 text-xs text-red-500">{formErrors.content}</p>}
              </div>
              <div>
                <label htmlFor="article-excerpt" className="mb-1.5 block text-sm font-medium text-gray-700">Excerpt (opsional)</label>
                <input id="article-excerpt" type="text" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              </div>
              <div>
                <label htmlFor="article-status" className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select id="article-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={handleCloseModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Batal</button>
              <button onClick={handleSave} className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
