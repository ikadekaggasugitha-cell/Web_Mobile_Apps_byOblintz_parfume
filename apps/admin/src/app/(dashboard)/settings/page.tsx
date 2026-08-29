'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setForm({ name: userData.name || '', email: userData.email || '', phone: userData.phone || '' });
    }
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage('');
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.put('/api/users/me', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.setItem('adminUser', JSON.stringify({ ...user, ...form }));
      setMessage('Profil berhasil disimpan');
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('Password baru tidak cocok');
      return;
    }

    setIsSaving(true);
    setMessage('');
    const token = localStorage.getItem('adminAccessToken');
    try {
      await api.put('/api/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password berhasil diubah');
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || 'Gagal mengubah password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes('berhasil') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      {/* Profile */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Profil Admin</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nama</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Telepon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
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

      {/* Change Password */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ubah Password</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password Saat Ini</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password Baru</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            />
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

      {/* Logout */}
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
