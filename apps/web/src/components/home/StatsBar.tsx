import { Section } from '@/components/layout/Section';

const STATS = [
  { value: '24 Jam', label: 'Proses Pengiriman' },
  { value: '4.9/5', label: 'Rating Pelanggan' },
  { value: '100%', label: 'Original & Tersegel' },
  { value: '10rb+', label: 'Botol Terjual' },
];

export function StatsBar() {
  return (
    <Section tone="sand" spacing="sm">
      <dl className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center px-4 py-5 text-center"
          >
            <dt className="font-serif text-3xl font-medium text-primary-700 sm:text-4xl">
              {stat.value}
            </dt>
            <dd className="mt-1.5 text-xs uppercase tracking-luxe text-warmgray">
              {stat.label}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
