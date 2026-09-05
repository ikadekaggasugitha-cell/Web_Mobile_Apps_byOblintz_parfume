'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Power, Ticket, RotateCcw } from 'lucide-react';
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

type View = 'active' | 'trash';

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
      if (view === 'trash') params.set('deleted', 'true');
      else if (statusFilter) params.set('status', statusFilter);

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
  }, [statusFilter, view]);

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

  const handleConfirm = useCallback(async () => {
    if (!confirm.id) return;
    try {
      if (confirm.mode === 'permanent') {
        await api.delete(`/api/promos/admin/${confirm.id}/permanent`);
        success('Promo dihapus permanen');
      } else {
        await api.delete(`/api/promos/admin/${confirm.id}`);
        success('Promo dipindahkan ke sampah');
      }
      refreshPromos();
    } catch (err) {
      console.error('Gagal hapus:', err);
      showError('Gagal menghapus promo');
    } finally {
      setConfirm({ open: false, id: null, mode: 'soft' });
    }
  }, [confirm.id, confirm.mode, refreshPromos, success, showError]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await api.post(`/api/promos/admin/${id}/restore`);
      refreshPromos();
      success('Promo berhasil dipulihkan');
    } catch (err) {
      console.error('Gagal pulihkan:', err);
      showError('Gagal memulihkan promo');
    }
  }, [refreshPromos, success, showError]);

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
        isOpen={confirm.open}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ open: false, id: null, mode: 'soft' })}
        title={confirm.mode === 'permanent' ? 'Hapus Permanen Promo' : 'Pindahkan ke Sampah'}
        message={
          confirm.mode === 'permanent'
            ? 'Promo akan dihapus permanen dari database dan TIDAK dapat dipulihkan. Lanjutkan?'
            : 'Promo akan dipindahkan ke Sampah. Anda masih dapat memulihkannya nanti.'
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
            Tambah Promo
          </button>
        )}
      </div>

      {view === 'active' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status"
            className="input sm:w-44"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="EXPIRED">Kedaluwarsa</option>
          </select>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Ticket className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {view === 'trash' ? 'Sampah kosong' : 'Tidak ada promo'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {view === 'trash'
                ? 'Promo yang dihapus akan muncul di sini.'
                : 'Coba ubah filter status atau tambahkan promo baru.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Kode</th>
                  <th className="th">Nama</th>
                  <th className="th">Tipe</th>
                  <th className="th">Nilai</th>
                  <th className="th">Penggunaan</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promos.map((promo) => (
                  <tr key={promo.id} className="transition-colors hover:bg-slate-50">
                    <td className="td font-medium text-slate-900">{promo.code}</td>
                    <td className="td text-slate-600">{promo.name || '-'}</td>
                    <td className="td">
                      <StatusBadge status={promo.type} labels={TYPE_LABELS} />
                    </td>
                    <td className="td tabular-nums">
                      {promo.type === 'PERCENTAGE'
                        ? `${promo.value}%`
                        : promo.type === 'FIXED'
                        ? formatCurrency(promo.value)
                        : 'Gratis Ongkir'}
                    </td>
                    <td className="td tabular-nums text-slate-600">
                      {promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                    </td>
                    <td className="td">
                      <StatusBadge status={promo.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        {view === 'trash' ? (
                          <>
                            <button
                              onClick={() => handleRestore(promo.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={2} />
                              Pulihkan
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: promo.id, mode: 'permanent' })}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                              Hapus Permanen
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenModal(promo)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(promo)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Power className="h-4 w-4" strokeWidth={2} />
                              {promo.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={() => setConfirm({ open: true, id: promo.id, mode: 'soft' })}
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

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Halaman{' '}
              <span className="font-medium text-slate-700">{pagination.page}</span>{' '}
              dari{' '}
              <span className="font-medium text-slate-700">{pagination.totalPages}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paginationPages.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  aria-current={p === pagination.page ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    p === pagination.page
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold">{editingPromo ? 'Edit Promo' : 'Promo Baru'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Kode Promo</label>
                <Input {...register('code')} error={errors.code?.message} placeholder="CONTOH10" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama</label>
                <Input {...register('name')} error={errors.name?.message} placeholder="Diskon 10%" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipe</label>
                  <select {...register('type')} className="input w-full">
                    <option value="PERCENTAGE">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                    <option value="FREE_SHIPPING">Gratis Ongkir</option>
                  </select>
                </div>
                {watchType !== 'FREE_SHIPPING' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Nilai {watchType === 'PERCENTAGE' ? '(%)' : '(Rp)'}
                    </label>
                    <Input type="number" {...register('value', { valueAsNumber: true })} error={errors.value?.message} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Min Order (Rp)</label>
                  <Input type="number" {...register('minOrder', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Max Diskon (Rp)</label>
                  <Input type="number" {...register('maxDiscount', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Batas Penggunaan</label>
                <Input type="number" {...register('usageLimit', { valueAsNumber: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal Mulai</label>
                  <Input type="datetime-local" {...register('startDate')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal Berakhir</label>
                  <Input type="datetime-local" {...register('endDate')} />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} className="rounded" />
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
