'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  link: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState({ title: '', subtitle: '', imageUrl: '', link: '', position: 'home', isActive: true });

  const fetchBanners = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('adminAccessToken');
    try {
      const response = await api.get('/api/banners/admin/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(response.data.data);
    } catch (error) {
      console.error('Gagal memuat banner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      if (editingBanner) {
        await api.put(`/api/banners/admin/${editingBanner.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/api/banners/admin', form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowModal(false);
      setEditingBanner(null);
      setForm({ title: '', subtitle: '', imageUrl: '', link: '', position: 'home', isActive: true });
      fetchBanners();
    } catch (error) {
      console.error('Gagal simpan:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus banner ini?')) return;
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.delete(`/api/banners/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBanners();
    } catch (error) {
      console.error('Gagal hapus:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banner</h1>
        <button
          onClick={() => { setShowModal(true); setEditingBanner(null); setForm({ title: '', subtitle: '', imageUrl: '', link: '', position: 'home', isActive: true }); }}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Banner Baru
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : banners.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada banner</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="p-4 font-medium">Gambar</th>
                <th className="p-4 font-medium">Judul</th>
                <th className="p-4 font-medium">Posisi</th>
                <th className="p-4 font-medium">Urutan</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <img src={banner.imageUrl} alt={banner.title} className="h-12 w-24 rounded object-cover" />
                  </td>
                  <td className="p-4 font-medium text-gray-900">{banner.title}</td>
                  <td className="p-4 text-gray-600">{banner.position}</td>
                  <td className="p-4 text-gray-600">{banner.sortOrder}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {banner.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setEditingBanner(banner); setForm({ title: banner.title, subtitle: banner.subtitle || '', imageUrl: banner.imageUrl, link: banner.link || '', position: banner.position, isActive: banner.isActive }); setShowModal(true); }} className="text-primary-500 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(banner.id)} className="text-red-500 hover:underline">Hapus</button>
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">{editingBanner ? 'Edit Banner' : 'Banner Baru'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <input type="text" placeholder="Subtitle (opsional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <input type="url" placeholder="URL Gambar" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <input type="url" placeholder="Link (opsional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              <div className="flex items-center gap-4">
                <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="h-10 rounded-lg border border-gray-300 px-3 text-sm">
                  <option value="home">Home</option>
                  <option value="category">Kategori</option>
                </select>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  <span className="text-sm">Aktif</span>
                </label>
              </div>
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
