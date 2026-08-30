import { BadgeCheck, Gift, ShieldCheck, Truck } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { SectionHeading } from './SectionHeading';

const VALUE_PROPS = [
  {
    icon: BadgeCheck,
    title: '100% Original',
    description: 'Dijamin asli, tersegel, dan sesuai deskripsi — tanpa kompromi.',
  },
  {
    icon: Gift,
    title: 'Gift Wrapping',
    description: 'Kemasan hadiah elegan yang dirancang untuk momen istimewa.',
  },
  {
    icon: ShieldCheck,
    title: 'Pembayaran Aman',
    description: 'Transaksi terenkripsi dengan beragam metode tepercaya.',
  },
  {
    icon: Truck,
    title: 'Pengiriman Cepat',
    description: 'Dikemas dengan cermat dan dikirim ke seluruh Indonesia.',
  },
];

export function ValueProps() {
  return (
    <Section tone="burgundy">
      <SectionHeading
        tone="dark"
        align="center"
        eyebrow="Mengapa OBLINTZ"
        title="Dirancang untuk Dipercaya"
      />

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-ivory/15 bg-primary-900/30 p-7 transition-colors duration-300 hover:border-gold-400/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/30 text-gold-300">
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-serif text-lg font-medium text-ivory">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ivory/65">
              {description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
