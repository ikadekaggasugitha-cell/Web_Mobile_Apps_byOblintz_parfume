'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layout/AuthLayout';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
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

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Masuk ke Akun"
      description={
        <>
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-primary-700 hover:underline">
            Daftar sekarang
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-primary-600"
            />
            <span className="text-warmgray">Ingat saya</span>
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-primary-700 hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Masuk
        </Button>
      </form>
    </AuthLayout>
  );
}
