'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, ImageOff, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  link: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string | null;
}

type View = 'active' | 'trash';

const bannerSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  subtitle: z.string().optional(),
  imageUrl: z.string().min(1, 'Gambar wajib diupload').url('URL Gambar tidak valid'),
  link: z.string().url('Link tidak valid').optional().or(z.literal('')),
  position: z.string().min(1, 'Posisi wajib dipilih'),
  isActive: z.boolean(),
});

type BannerInput = z.infer<typeof bannerSchema>;

const DEFAULT_VALUES: BannerInput = {
  title: '',
  subtitle: '',
  imageUrl: '',
  link: '',
  position: 'home',
  isActive: true,
};

export default function AdminBannersPage() {
  const { toasts, success, error: showError } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [view, setView] = useState<View>('active');
  const [confirm, setConfirm] = useState<{
    open: boolean;
    id: string | null;
    mode: 'soft' | 'permanent';
  }>({ open: false, id: null, mode: 'soft' });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BannerInput>({
    resolver: zodResolver(bannerSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const listUrl =
    view === 'trash' ? '/api/banners/admin/all?deleted=true' : '/api/banners/admin/all';

  const refreshBanners = useCallback(async () => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      const response = await api.get(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(response.data.data);
    } catch (error) {
      console.error('Gagal memuat banner:', error);
    }
  }, [listUrl]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('adminAccessToken');
      try {
        const response = await api.get(listUrl, {
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
  }, [listUrl]);

  const onSubmit = useCallback(async (data: BannerInput) => {
    const token = localStorage.getItem('adminAccessToken');
    // Omit blank optional fields so the API's URL validation doesn't reject ''.
    const payload = {
      title: data.title,
      imageUrl: data.imageUrl,
      position: data.position,
      isActive: data.isActive,
      ...(data.subtitle?.trim() ? { subtitle: data.subtitle.trim() } : {}),
      ...(data.link?.trim() ? { link: data.link.trim() } : {}),
    };
    try {
      if (editingBanner) {
        await api.put(`/api/banners/admin/${editingBanner.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Banner berhasil diupdate');
      } else {
        await api.post('/api/banners/admin', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        success('Banner berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingBanner(null);
      reset(DEFAULT_VALUES);
      refreshBanners();
    } catch (error) {
      console.error('Gagal simpan:', error);
      showError('Gagal menyimpan banner');
    }
  }, [editingBanner, reset, refreshBanners, success, showError]);

  const handleConfirm = useCallback(async () => {
    if (!confirm.id) return;

    const token = localStorage.getItem('adminAccessToken');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (confirm.mode === 'permanent') {
        await api.delete(`/api/banners/admin/${confirm.id}/permanent`, { headers });
        success('Banner dihapus permanen');
      } else {
        await api.delete(`/api/banners/admin/${confirm.id}`, { headers });
        success('Banner dipindahkan ke sampah');
      }
      refreshBanners();
    } catch (error) {
      console.error('Gagal hapus:', error);
      showError('Gagal menghapus banner');
    } finally {
      setConfirm({ open: false, id: null, mode: 'soft' });
    }
  }, [confirm.id, confirm.mode, refreshBanners, success, showError]);

  const handleRestore = useCallback(async (id: string) => {
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.post(`/api/banners/admin/${id}/restore`, undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshBanners();
      success('Banner berhasil dipulihkan');
    } catch (error) {
      console.error('Gagal pulihkan:', error);
      showError('Gagal memulihkan banner');
    }
  }, [refreshBanners, success, showError]);

  const handleOpenModal = useCallback((banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      reset({
        title: banner.title,
        subtitle: banner.subtitle || '',
        imageUrl: banner.imageUrl,
        link: banner.link || '',
        position: banner.position,
        isActive: banner.isActive,
      });
    } else {
      setEditingBanner(null);
      reset(DEFAULT_VALUES);
    }
    setShowModal(true);
  }, [reset]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingBanner(null);
    reset(DEFAULT_VALUES);
  }, [reset]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ open: false, id: null, mode: 'soft' })}
        title={confirm.mode === 'permanent' ? 'Hapus Permanen Banner' : 'Pindahkan ke Sampah'}
        message={
          confirm.mode === 'permanent'
            ? 'Banner akan dihapus permanen dari database dan TIDAK dapat dipulihkan. Lanjutkan?'
            : 'Banner akan dipindahkan ke Sampah. Anda masih dapat memulihkannya nanti.'
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
            Tambah Banner
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
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ImageOff className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {view === 'trash' ? 'Sampah kosong' : 'Tidak ada banner'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {view === 'trash'
                ? 'Banner yang dihapus akan muncul di sini.'
                : 'Tambahkan banner untuk tampil di halaman toko.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Gambar</th>
                  <th className="th">Judul</th>
                  <th className="th">Posisi</th>
                  <th className="th">Urutan</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banners.map((banner) => (
                  <tr key={banner.id} className="transition-colors hover:bg-slate-50">
                    <td className="td">
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title}
                        width={96}
                        height={48}
                        className="h-12 w-24 rounded-lg border border-slate-200 object-cover"
                        unoptimized
                      />
                    </td>
                    <td className="td font-medium text-slate-900">{banner.title}</td>
                    <td className="td text-slate-600">{banner.position}</td>
                    <td className="td tabular-nums text-slate-600">{banner.sortOrder}</td>
                    <td className="td">
                      <StatusBadge
                        status={banner.isActive ? 'active' : 'inactive'}
                        labels={{
                          active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
                          inactive: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-800' },
                        }}
                      />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {view === 'trash' ? (
                          <>
                            <button
                              onClick={() => handleRestore(banner.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={2} />
                              Pulihkan
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: banner.id, mode: 'permanent' })}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                              Hapus Permanen
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenModal(banner)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2} />
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: banner.id, mode: 'soft' })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="banner-modal-title">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
            <h2 id="banner-modal-title" className="mb-4 text-lg font-semibold">{editingBanner ? 'Edit Banner' : 'Banner Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="banner-title" className="mb-1.5 block text-sm font-medium text-slate-700">Judul</label>
                <Input id="banner-title" {...register('title')} error={errors.title?.message} />
              </div>
              <div>
                <label htmlFor="banner-subtitle" className="mb-1.5 block text-sm font-medium text-slate-700">Subtitle (opsional)</label>
                <Input id="banner-subtitle" {...register('subtitle')} />
              </div>
              <ImageUpload
                value={watch('imageUrl') || ''}
                onChange={(url) => setValue('imageUrl', url, { shouldValidate: true })}
                error={errors.imageUrl?.message}
              />
              <div>
                <label htmlFor="banner-link" className="mb-1.5 block text-sm font-medium text-slate-700">Link (opsional)</label>
                <Input id="banner-link" type="url" {...register('link')} error={errors.link?.message} />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label htmlFor="banner-position" className="mb-1.5 block text-sm font-medium text-slate-700">Posisi</label>
                  <select id="banner-position" {...register('position')} className="input w-full">
                    <option value="home">Home</option>
                    <option value="category">Kategori</option>
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('isActive')} className="rounded border-slate-300" />
                  <span className="text-sm text-slate-700">Aktif</span>
                </label>
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
