'use client';

import { useState, type FormEvent } from 'react';
import { Check, Mail } from 'lucide-react';

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
    <section className="bg-cream py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm sm:px-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-600">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-6 font-serif text-2xl font-medium text-stone-900 sm:text-3xl">
            Bergabung dengan OBLINTZ
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-stone-600">
            Dapatkan penawaran eksklusif, peluncuran koleksi terbaru, dan diskon
            10% untuk pembelian pertama Anda.
          </p>

          {status === 'done' ? (
            <p
              role="status"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Terima kasih! Anda telah berlangganan.
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
                className="h-12 flex-1 rounded-full border border-stone-300 bg-white px-5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary-600 px-7 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-60"
              >
                {status === 'submitting' ? 'Mengirim…' : 'Berlangganan'}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-stone-400">
            Kami menghormati privasi Anda. Berhenti berlangganan kapan saja.
          </p>
        </div>
      </div>
    </section>
  );
}
