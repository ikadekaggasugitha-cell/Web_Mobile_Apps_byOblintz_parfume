'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="h-10 w-full rounded-lg border border-gray-300 px-4 text-sm focus:border-primary-500 focus:outline-none sm:w-64"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-medium hover:bg-gray-200"
          >
            Cari
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Semua Role</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada pengguna ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Pesanan</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Tanggal Daftar</th>
                  <th className="p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{user.name}</p>
                    </td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4">
                      <StatusBadge status={user.role} labels={ROLE_LABELS} />
                    </td>
                    <td className="p-4 text-gray-600">{user._count.orders}</td>
                    <td className="p-4">
                      <StatusBadge
                        status={user.banned ? 'banned' : 'active'}
                        labels={{
                          active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
                          banned: { label: 'Diblokir', color: 'bg-red-100 text-red-800' },
                        }}
                      />
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(user)} className="text-primary-500 hover:underline">Edit</button>
                        <button
                          onClick={() => setBanConfirm({ open: true, user })}
                          className={user.banned ? 'text-green-600 hover:underline' : 'text-yellow-600 hover:underline'}
                        >
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
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Edit Pengguna</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={formErrors.name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={formErrors.email}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Telepon</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={handleCloseModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Batal</button>
                <button onClick={handleSaveUser} disabled={isSaving} className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600 disabled:opacity-50">
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
