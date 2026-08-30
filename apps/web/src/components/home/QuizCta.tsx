import Link from 'next/link';
import { ArrowRight, Wand2 } from 'lucide-react';
import { Section } from '@/components/layout/Section';

export function QuizCta() {
  return (
    <Section tone="ivory" spacing="sm">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-6 py-14 text-center ring-1 ring-gold-400/20 sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(198,161,91,0.25),transparent_60%)]" />
          <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(152,87,97,0.4),transparent_60%)]" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/30 text-gold-300">
            <Wand2 className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="mt-6 font-serif text-3xl font-medium text-ivory sm:text-4xl">
            Belum Yakin Aroma yang Tepat?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-ivory/70">
            Jawab beberapa pertanyaan singkat dan biarkan kami merekomendasikan
            parfum yang paling mencerminkan kepribadian Anda.
          </p>
          <Link
            href="/quiz"
            className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-ivory px-8 text-sm font-medium text-primary-800 transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
          >
            Mulai Quiz Parfum
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </Section>
  );
}
