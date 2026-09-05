import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FileQuestion className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">404</h1>
      <p className="mt-3 text-lg text-slate-500">
        Halaman admin tidak ditemukan
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
