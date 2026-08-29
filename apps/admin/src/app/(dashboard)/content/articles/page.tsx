'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  author: string;
  createdAt: string;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', status: 'DRAFT' });

  const fetchArticles = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [statusFilter]);

  const handleSave = async () => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      if (editingArticle) {
        await api.put(`/api/articles/admin/${editingArticle.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/api/articles/admin', form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowModal(false);
      setEditingArticle(null);
      setForm({ title: '', content: '', excerpt: '', status: 'DRAFT' });
      fetchArticles();
    } catch (error) {
      console.error('Gagal simpan:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus artikel ini?')) return;
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.delete(`/api/articles/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchArticles();
    } catch (error) {
      console.error('Gagal hapus:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Artikel</h1>
        <button
          onClick={() => { setShowModal(true); setEditingArticle(null); setForm({ title: '', content: '', excerpt: '', status: 'DRAFT' }); }}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Artikel Baru
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
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

      {/* Table */}
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
                    <button onClick={() => { setEditingArticle(article); setForm({ title: article.title, content: '', excerpt: article.excerpt || '', status: article.status }); setShowModal(true); }} className="text-primary-500 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(article.id)} className="text-red-500 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">{editingArticle ? 'Edit Artikel' : 'Artikel Baru'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <textarea placeholder="Konten..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="h-40 w-full rounded-lg border border-gray-300 p-3 text-sm" />
              <input type="text" placeholder="Excerpt (opsional)" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Batal</button>
              <button onClick={handleSave} className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
