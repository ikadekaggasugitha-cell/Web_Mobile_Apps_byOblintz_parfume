'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
          Terjadi Kesalahan
        </h1>
        <p className="mb-6 text-slate-600">
          Maaf, terjadi kesalahan yang tidak terduga di admin panel.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
