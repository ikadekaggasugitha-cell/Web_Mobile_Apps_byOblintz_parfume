'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md rounded-2xl border border-line bg-white p-10 shadow-soft">
        <p className="text-xs uppercase tracking-luxe text-gold-600">Terjadi Kesalahan</p>
        <h1 className="mt-3 font-serif text-2xl font-medium text-espresso">
          Ada yang Tidak Beres
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-warmgray">
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
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
