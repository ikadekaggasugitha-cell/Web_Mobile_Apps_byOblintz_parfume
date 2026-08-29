'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', data);
      const { accessToken, refreshToken, user } = response.data.data;

      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setError('Anda tidak memiliki akses admin');
        return;
      }

      localStorage.setItem('adminAccessToken', accessToken);
      localStorage.setItem('adminRefreshToken', refreshToken);
      localStorage.setItem('adminUser', JSON.stringify(user));

      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">OBLINTZ Admin</h1>
          <p className="mt-2 text-gray-500">Masuk ke panel administrasi</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              type="email"
              {...register('email')}
              placeholder="admin@oblintz.com"
              error={errors.email?.message}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              error={errors.password?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
