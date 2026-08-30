'use client';

import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || status === 'submitting') return;
    setStatus('submitting');
    // TODO: wire to a real newsletter endpoint. Optimistic confirmation for now.
    setTimeout(() => setStatus('done'), 600);
  };

  return (
    <Section tone="sand">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow flank className="mb-4">
          Inner Circle
        </Eyebrow>
        <h2 className="font-serif text-3xl font-medium leading-tight tracking-[-0.01em] text-espresso sm:text-4xl">
          Gabung dengan Inner Circle
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-warmgray">
          Akses awal ke peluncuran terbatas, harga khusus anggota, dan panduan
          olfaktori — plus diskon 10% untuk pembelian pertama Anda.
        </p>

        {status === 'done' ? (
          <p
            role="status"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-ivory"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Terima kasih! Anda telah bergabung.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Alamat email
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
              className="h-12 flex-1 rounded-[10px] border border-line bg-white px-5 text-sm text-espresso placeholder:text-warmgray/60 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-primary-600 px-7 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand disabled:pointer-events-none disabled:opacity-60"
            >
              {status === 'submitting' ? 'Mengirim…' : 'Berlangganan'}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-warmgray/70">
          Kami menghormati privasi Anda. Berhenti berlangganan kapan saja.
        </p>
      </div>
    </Section>
  );
}
