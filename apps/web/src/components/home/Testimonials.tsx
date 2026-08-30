import { Star } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from './SectionHeading';

const TESTIMONIALS = [
  {
    quote:
      'Sudah tiga kali orang bertanya parfum apa yang saya pakai. Aromanya benar-benar terasa seperti tanda tangan pribadi.',
    name: 'Ahmad K.',
    meta: 'Pembeli Terverifikasi',
  },
  {
    quote:
      'Awalnya ragu beli parfum online, tapi jaminan keaslian dan kemasannya membuat saya tenang. Sekarang jadi langganan.',
    name: 'Sarah L.',
    meta: 'Pembeli Terverifikasi',
  },
  {
    quote:
      'Kemasannya 10/10 — terasa mewah dan berkelas. Aromanya bertahan seharian di pakaian. Sangat sepadan.',
    name: 'Omar R.',
    meta: 'Pembeli Terverifikasi',
  },
];

export function Testimonials() {
  return (
    <Section tone="oxblood">
      <SectionHeading
        tone="dark"
        align="center"
        eyebrow="Testimoni"
        title="Kata Mereka tentang OBLINTZ"
        description="Ribuan pelanggan telah menemukan aroma yang menuturkan kisah mereka."
      />

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-2xl border border-ivory/12 bg-rosewood-600/25 p-7"
          >
            <div className="flex gap-1 text-gold-300" aria-label="Rating 5 dari 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
              ))}
            </div>
            <blockquote className="mt-5 flex-1 font-serif text-lg italic leading-relaxed text-ivory/90">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-6 border-t border-ivory/12 pt-4">
              <p className="text-sm font-medium text-ivory">{t.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-luxe text-gold-300/80">
                {t.meta}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
