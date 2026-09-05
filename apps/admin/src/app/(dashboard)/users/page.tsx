'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Pencil, Ban, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { Pagination } from '@oblintz/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
  _count: { orders: number; subscriptions: number };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  USER: { label: 'User', color: 'bg-gray-100 text-gray-800' },
  ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
};

export default function AdminUsersPage() {
  const { toasts, success, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [banConfirm, setBanConfirm] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const refreshUsers = useCallback(async (page = 1, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const response = await api.get(`/api/users/admin/all?${params}`, { signal });
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Gagal memuat pengguna:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const controller = new AbortController();
    refreshUsers(1, controller.signal);
    return () => controller.abort();
  }, [refreshUsers]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  const handleOpenModal = useCallback((user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, phone: user.phone || '' });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '' });
    setFormErrors({});
  }, []);

  const handleSaveUser = useCallback(async () => {
    setFormErrors({});
    if (!editingUser) return;

    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Nama wajib diisi';
    if (!form.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email tidak valid';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/api/users/admin/${editingUser.id}`, form);
      success('Pengguna berhasil diupdate');
      setShowModal(false);
      setEditingUser(null);
      refreshUsers();
    } catch (err: any) {
      showError(err.response?.data?.error?.message || 'Gagal mengupdate pengguna');
    } finally {
      setIsSaving(false);
    }
  }, [editingUser, form, refreshUsers, success, showError]);

  const handleBanConfirm = useCallback(async () => {
    if (!banConfirm.user) return;
    try {
      const response = await api.put(`/api/users/admin/${banConfirm.user.id}/ban`);
      refreshUsers();
      success(response.data.data.message);
    } catch (err) {
      showError('Gagal mengubah status blokir');
    } finally {
      setBanConfirm({ open: false, user: null });
    }
  }, [banConfirm.user, refreshUsers, success, showError]);

  const handlePageChange = useCallback((page: number) => {
    refreshUsers(page);
  }, [refreshUsers]);

  const paginationPages = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }, [pagination]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={banConfirm.open}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanConfirm({ open: false, user: null })}
        title={banConfirm.user?.banned ? 'Buka Blokir User' : 'Blokir User'}
        message={banConfirm.user?.banned
          ? `Yakin ingin membuka blokir ${banConfirm.user?.name}?`
          : `Yakin ingin memblokir ${banConfirm.user?.name}? User tidak akan bisa login.`}
        confirmLabel={banConfirm.user?.banned ? 'Buka Blokir' : 'Blokir'}
        variant={banConfirm.user?.banned ? 'default' : 'danger'}
      />

      <p className="text-sm text-slate-500">Kelola akun pelanggan dan peran akses.</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            aria-label="Cari nama atau email"
            className="input w-full pl-9"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter role"
          className="input sm:w-44"
        >
          <option value="">Semua Role</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Tidak ada pengguna ditemukan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Coba ubah kata kunci atau filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="th">Nama</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th">Pesanan</th>
                  <th className="th">Status</th>
                  <th className="th">Tanggal Daftar</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="td font-medium text-slate-900">{user.name}</td>
                    <td className="td text-slate-500">{user.email}</td>
                    <td className="td">
                      <StatusBadge status={user.role} labels={ROLE_LABELS} />
                    </td>
                    <td className="td tabular-nums text-slate-500">{user._count.orders}</td>
                    <td className="td">
                      <StatusBadge
                        status={user.banned ? 'banned' : 'active'}
                        labels={{
                          active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
                          banned: { label: 'Diblokir', color: 'bg-red-100 text-red-800' },
                        }}
                      />
                    </td>
                    <td className="td tabular-nums text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => setBanConfirm({ open: true, user })}
                          className={
                            user.banned
                              ? 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50'
                              : 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50'
                          }
                        >
                          {user.banned ? (
                            <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                          ) : (
                            <Ban className="h-4 w-4" strokeWidth={2} />
                          )}
                          {user.banned ? 'Unban' : 'Ban'}
                        </button>
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
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Edit Pengguna</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={formErrors.name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={formErrors.email}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Telepon</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={handleCloseModal} className="btn-secondary">Batal</button>
                <button onClick={handleSaveUser} disabled={isSaving} className="btn-primary">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
