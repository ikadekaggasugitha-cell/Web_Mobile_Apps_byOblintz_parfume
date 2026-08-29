'use client';

import { useEffect } from 'react';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ShopError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-4 text-6xl">🛒</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Gagal Memuat Halaman
        </h1>
        <p className="mb-6 text-gray-600">
          Terjadi kesalahan saat memuat halaman toko. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
