'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import type { AdminUser } from '@oblintz/shared';

const profileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().regex(/^[0-9+\-\s]*$/, 'Nomor telepon tidak valid').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password baru tidak cocok',
  path: ['confirmPassword'],
});

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setForm({ name: userData.name || '', email: userData.email || '', phone: userData.phone || '' });
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setFormErrors({});

    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.put('/api/users/me', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.setItem('adminUser', JSON.stringify({ ...user, ...form }));
      success('Profil berhasil disimpan');
    } catch (error: any) {
      showError(error.response?.data?.error?.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  }, [form, user, success, showError]);

  const handleChangePassword = useCallback(async () => {
    setPasswordErrors({});

    const result = passwordSchema.safeParse(passwordForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setPasswordErrors(errors);
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.put('/api/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Password berhasil diubah');
    } catch (error: any) {
      showError(error.response?.data?.error?.message || 'Gagal mengubah password');
    } finally {
      setIsSaving(false);
    }
  }, [passwordForm, success, showError]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  }, [router]);

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Profil Admin</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${formErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Telepon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${formErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ubah Password</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password Saat Ini</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${passwordErrors.currentPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {passwordErrors.currentPassword && <p className="mt-1 text-xs text-red-500">{passwordErrors.currentPassword}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${passwordErrors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {passwordErrors.newPassword && <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${passwordErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`}
            />
            {passwordErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>}
          </div>
          <button
            onClick={handleChangePassword}
            disabled={isSaving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Akun</h2>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Keluar dari Admin Panel
        </button>
      </div>
    </div>
  );
}
