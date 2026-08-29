import { BadgeCheck, Gift, ShieldCheck, Truck } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: BadgeCheck,
    title: '100% Original',
    description: 'Dijamin asli, tersegel, dan sesuai deskripsi.',
  },
  {
    icon: Gift,
    title: 'Gift Wrapping',
    description: 'Kemasan hadiah elegan untuk momen spesial.',
  },
  {
    icon: ShieldCheck,
    title: 'Pembayaran Aman',
    description: 'Transaksi terenkripsi dengan banyak metode.',
  },
  {
    icon: Truck,
    title: 'Pengiriman Cepat',
    description: 'Dikemas hati-hati dan dikirim ke seluruh Indonesia.',
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="container mx-auto grid grid-cols-1 gap-px overflow-hidden px-4 py-2 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-4 px-2 py-6 sm:px-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
              <p className="mt-1 text-sm leading-snug text-stone-600">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
