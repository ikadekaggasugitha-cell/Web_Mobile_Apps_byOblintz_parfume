'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';

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

const INITIAL_FORM = { title: '', subtitle: '', imageUrl: '', link: '', position: 'home', isActive: true };

export default function AdminBannersPage() {
  const { toasts, success, error: showError } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const refreshBanners = useCallback(async () => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      const response = await api.get('/api/banners/admin/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(response.data.data);
    } catch (error) {
      console.error('Gagal memuat banner:', error);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('adminAccessToken');
      try {
        const response = await api.get('/api/banners/admin/all', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setBanners(response.data.data);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat banner:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Judul wajib diisi';
    if (!form.imageUrl.trim()) errors.imageUrl = 'URL Gambar wajib diisi';
    else if (!/^https?:\/\/.+\..+/.test(form.imageUrl)) errors.imageUrl = 'URL Gambar tidak valid';
    if (form.link && form.link.trim() && !/^https?:\/\/.+\..+/.test(form.link)) errors.link = 'Link tidak valid';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem('adminAccessToken');
    try {
      if (editingBanner) {
        await api.put(`/api/banners/admin/${editingBanner.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Banner berhasil diupdate');
      } else {
        await api.post('/api/banners/admin', form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Banner berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingBanner(null);
      setForm(INITIAL_FORM);
      refreshBanners();
    } catch (error) {
      console.error('Gagal simpan:', error);
      showError('Gagal menyimpan banner');
    }
  }, [editingBanner, form, validateForm, refreshBanners, success, showError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;

    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.delete(`/api/banners/admin/${deleteConfirm.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshBanners();
      success('Banner berhasil dihapus');
    } catch (error) {
      console.error('Gagal hapus:', error);
      showError('Gagal menghapus banner');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshBanners, success, showError]);

  const handleOpenModal = useCallback((banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({ title: banner.title, subtitle: banner.subtitle || '', imageUrl: banner.imageUrl, link: banner.link || '', position: banner.position, isActive: banner.isActive });
    } else {
      setEditingBanner(null);
      setForm(INITIAL_FORM);
    }
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingBanner(null);
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
        title="Hapus Banner"
        message="Yakin ingin menghapus banner ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banner</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Banner Baru
        </button>
      </div>

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
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      width={96}
                      height={48}
                      className="h-12 w-24 rounded object-cover"
                      unoptimized
                    />
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
                    <button onClick={() => handleOpenModal(banner)} className="text-primary-500 hover:underline">Edit</button>
                    <button onClick={() => setDeleteConfirm({ open: true, id: banner.id })} className="text-red-500 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="banner-modal-title">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <h2 id="banner-modal-title" className="mb-4 text-lg font-semibold">{editingBanner ? 'Edit Banner' : 'Banner Baru'}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="banner-title" className="mb-1.5 block text-sm font-medium text-gray-700">Judul</label>
                <input id="banner-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`h-10 w-full rounded-lg border px-3 text-sm ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`} />
                {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
              </div>
              <div>
                <label htmlFor="banner-subtitle" className="mb-1.5 block text-sm font-medium text-gray-700">Subtitle (opsional)</label>
                <input id="banner-subtitle" type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
              </div>
              <div>
                <label htmlFor="banner-image" className="mb-1.5 block text-sm font-medium text-gray-700">URL Gambar</label>
                <input id="banner-image" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={`h-10 w-full rounded-lg border px-3 text-sm ${formErrors.imageUrl ? 'border-red-500' : 'border-gray-300'}`} />
                {formErrors.imageUrl && <p className="mt-1 text-xs text-red-500">{formErrors.imageUrl}</p>}
              </div>
              <div>
                <label htmlFor="banner-link" className="mb-1.5 block text-sm font-medium text-gray-700">Link (opsional)</label>
                <input id="banner-link" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={`h-10 w-full rounded-lg border px-3 text-sm ${formErrors.link ? 'border-red-500' : 'border-gray-300'}`} />
                {formErrors.link && <p className="mt-1 text-xs text-red-500">{formErrors.link}</p>}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label htmlFor="banner-position" className="mb-1.5 block text-sm font-medium text-gray-700">Posisi</label>
                  <select id="banner-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="h-10 rounded-lg border border-gray-300 px-3 text-sm">
                    <option value="home">Home</option>
                    <option value="category">Kategori</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  <span className="text-sm">Aktif</span>
                </label>
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
