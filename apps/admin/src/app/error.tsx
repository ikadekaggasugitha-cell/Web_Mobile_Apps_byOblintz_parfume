'use client';

import { useEffect } from 'react';

export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminGlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-4 text-6xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Terjadi Kesalahan
        </h1>
        <p className="mb-6 text-gray-600">
          Maaf, terjadi kesalahan yang tidak terduga di admin panel.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
