'use client';

import { useEffect } from 'react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AuthError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 text-center">
      <div className="max-w-md rounded-2xl border border-line bg-white p-10 shadow-soft">
        <p className="text-xs uppercase tracking-luxe text-gold-600">Terjadi Kesalahan</p>
        <h1 className="mt-3 font-serif text-2xl font-medium text-espresso">
          Gagal Memuat Halaman
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-warmgray">
          Terjadi kesalahan saat memuat halaman autentikasi. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-[10px] bg-primary-600 px-7 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
