'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Pagination } from '@oblintz/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Promo {
  id: string;
  code: string;
  name: string | null;
  type: string;
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
}

const promoSchema = z.object({
  code: z.string().min(3, 'Kode minimal 3 karakter').max(50),
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.number().min(0, 'Nilai tidak boleh negatif'),
  minOrder: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().int().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type PromoInput = z.infer<typeof promoSchema>;

const DEFAULT_VALUES: PromoInput = {
  code: '',
  name: '',
  type: 'PERCENTAGE',
  value: 0,
  minOrder: null,
  maxDiscount: null,
  usageLimit: null,
  startDate: null,
  endDate: null,
  isActive: true,
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PERCENTAGE: { label: 'Persen', color: 'bg-blue-100 text-blue-800' },
  FIXED: { label: 'Nominal', color: 'bg-green-100 text-green-800' },
  FREE_SHIPPING: { label: 'Gratis Ongkir', color: 'bg-purple-100 text-purple-800' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-800' },
  EXPIRED: { label: 'Kedaluwarsa', color: 'bg-red-100 text-red-800' },
};

export default function AdminPromosPage() {
  const { toasts, success, error: showError } = useToast();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromoInput>({
    resolver: zodResolver(promoSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const watchType = watch('type');

  const refreshPromos = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);

      const response = await api.get(`/api/promos/admin/all?${params}`, { signal });
      setPromos(response.data.data.promos);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat promo:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    refreshPromos(1, controller.signal);
    return () => controller.abort();
  }, [refreshPromos]);

  const onSubmit = useCallback(async (data: PromoInput) => {
    try {
      const toIsoDate = (v: string | null | undefined) =>
        v ? new Date(v).toISOString() : undefined;

      const payload = {
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type,
        value: data.type === 'FREE_SHIPPING' ? 0 : data.value,
        minOrder: data.minOrder && !isNaN(data.minOrder) ? data.minOrder : undefined,
        maxDiscount: data.maxDiscount && !isNaN(data.maxDiscount) ? data.maxDiscount : undefined,
        usageLimit: data.usageLimit && !isNaN(data.usageLimit) ? data.usageLimit : undefined,
        startDate: toIsoDate(data.startDate),
        endDate: toIsoDate(data.endDate),
        isActive: data.isActive,
      };

      if (editingPromo) {
        await api.put(`/api/promos/admin/${editingPromo.id}`, payload);
        success('Promo berhasil diupdate');
      } else {
        await api.post('/api/promos/admin', payload);
        success('Promo berhasil ditambahkan');
      }
      setShowModal(false);
      setEditingPromo(null);
      reset(DEFAULT_VALUES);
      refreshPromos();
    } catch (err) {
      console.error('Gagal simpan:', err);
      showError('Gagal menyimpan promo');
    }
  }, [editingPromo, reset, refreshPromos, success, showError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.delete(`/api/promos/admin/${deleteConfirm.id}`);
      refreshPromos();
      success('Promo berhasil dihapus');
    } catch (err) {
      console.error('Gagal hapus:', err);
      showError('Gagal menghapus promo');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, refreshPromos, success, showError]);

  const handleToggleStatus = useCallback(async (promo: Promo) => {
    try {
      await api.put(`/api/promos/admin/${promo.id}/toggle`);
      refreshPromos();
      success(`Promo ${promo.status === 'ACTIVE' ? 'dinonaktifkan' : 'diaktifkan'}`);
    } catch (err) {
      showError('Gagal mengubah status promo');
    }
  }, [refreshPromos, success, showError]);

  const handleOpenModal = useCallback((promo?: Promo) => {
    if (promo) {
      setEditingPromo(promo);
      reset({
        code: promo.code,
        name: promo.name || '',
        type: promo.type as any,
        value: Number(promo.value),
        minOrder: promo.minOrder ? Number(promo.minOrder) : null,
        maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
        usageLimit: promo.usageLimit,
        startDate: promo.startDate ? promo.startDate.slice(0, 16) : null,
        endDate: promo.endDate ? promo.endDate.slice(0, 16) : null,
        isActive: promo.status === 'ACTIVE',
      });
    } else {
      setEditingPromo(null);
      reset(DEFAULT_VALUES);
    }
    setShowModal(true);
  }, [reset]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingPromo(null);
    reset(DEFAULT_VALUES);
  }, [reset]);

  const handlePageChange = useCallback((page: number) => {
    refreshPromos(page);
  }, [refreshPromos]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        title="Hapus Promo"
        message="Yakin ingin menghapus promo ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        variant="danger"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promo</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Promo Baru
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="EXPIRED">Kedaluwarsa</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : promos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada promo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Kode</th>
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Tipe</th>
                  <th className="p-4 font-medium">Nilai</th>
                  <th className="p-4 font-medium">Penggunaan</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{promo.code}</td>
                    <td className="p-4 text-gray-600">{promo.name || '-'}</td>
                    <td className="p-4">
                      <StatusBadge status={promo.type} labels={TYPE_LABELS} />
                    </td>
                    <td className="p-4">
                      {promo.type === 'PERCENTAGE'
                        ? `${promo.value}%`
                        : promo.type === 'FIXED'
                        ? formatCurrency(promo.value)
                        : 'Gratis Ongkir'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={promo.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(promo)} className="text-primary-500 hover:underline">Edit</button>
                        <button onClick={() => handleToggleStatus(promo)} className="text-yellow-600 hover:underline">
                          {promo.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button onClick={() => setDeleteConfirm({ open: true, id: promo.id })} className="text-red-500 hover:underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 border-t border-gray-200 p-4">
            {paginationPages.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`h-8 rounded-lg px-3 text-sm ${
                  p === pagination.page
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">{editingPromo ? 'Edit Promo' : 'Promo Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Kode Promo</label>
                <Input {...register('code')} error={errors.code?.message} placeholder="CONTOH10" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
                <Input {...register('name')} error={errors.name?.message} placeholder="Diskon 10%" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipe</label>
                  <select {...register('type')} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm">
                    <option value="PERCENTAGE">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                    <option value="FREE_SHIPPING">Gratis Ongkir</option>
                  </select>
                </div>
                {watchType !== 'FREE_SHIPPING' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Nilai {watchType === 'PERCENTAGE' ? '(%)' : '(Rp)'}
                    </label>
                    <Input type="number" {...register('value', { valueAsNumber: true })} error={errors.value?.message} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Min Order (Rp)</label>
                  <Input type="number" {...register('minOrder', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Max Diskon (Rp)</label>
                  <Input type="number" {...register('maxDiscount', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Batas Penggunaan</label>
                <Input type="number" {...register('usageLimit', { valueAsNumber: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                  <Input type="datetime-local" {...register('startDate')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tanggal Berakhir</label>
                  <Input type="datetime-local" {...register('endDate')} />
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
