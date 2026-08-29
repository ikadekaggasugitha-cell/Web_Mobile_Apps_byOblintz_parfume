import Link from 'next/link';
import { ArrowRight, Wand2 } from 'lucide-react';

export function QuizCta() {
  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-primary-700/40 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-gold-600/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-gold-300 ring-1 ring-white/15">
              <Wand2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-6 font-serif text-3xl font-medium text-white sm:text-4xl">
              Belum Tahu Aroma yang Tepat?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-stone-300">
              Jawab beberapa pertanyaan singkat dan biarkan kami merekomendasikan
              parfum yang paling cocok dengan kepribadian Anda.
            </p>
            <Link
              href="/quiz"
              className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-medium text-stone-900 transition-colors duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
            >
              Mulai Quiz Parfum
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
