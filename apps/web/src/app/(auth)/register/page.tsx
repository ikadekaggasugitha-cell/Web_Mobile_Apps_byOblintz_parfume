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

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registrasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Buat Akun Baru"
      description={
        <>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-primary-700 hover:underline">
            Masuk
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
          label="Nama Lengkap"
          placeholder="Nama Anda"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Nomor Telepon"
          type="tel"
          placeholder="081234567890"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Konfirmasi Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Daftar
        </Button>
      </form>
    </AuthLayout>
  );
}
