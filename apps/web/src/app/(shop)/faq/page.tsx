import { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiBase';
import { PageHeader } from '@/components/layout/PageHeader';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'FAQ — Pertanyaan yang Sering Diajukan',
  description:
    'Temukan jawaban seputar keaslian produk, pengiriman, pembayaran, retur, dan layanan OBLINTZ.',
  alternates: { canonical: '/faq' },
};

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

async function getFaqs(): Promise<Faq[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/faq`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

const UNCATEGORIZED = 'Umum';

function groupByCategory(faqs: Faq[]): [string, Faq[]][] {
  const groups = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const key = faq.category?.trim() || UNCATEGORIZED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(faq);
    else groups.set(key, [faq]);
  }
  return Array.from(groups.entries());
}

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = groupByCategory(faqs);

  const faqJsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null;

  return (
    <>
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="mb-10 border-b border-line pb-8">
          <PageHeader
            eyebrow="Bantuan"
            title="Pertanyaan yang Sering Diajukan"
            description="Jawaban cepat seputar keaslian produk, pengiriman, pembayaran, dan layanan kami."
          />
        </div>

        {faqs.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="font-serif text-2xl font-medium text-espresso">
              Belum Ada FAQ
            </h2>
            <p className="mt-2 text-warmgray">
              Pertanyaan yang sering diajukan akan segera hadir di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map(([category, items]) => (
              <section key={category}>
                {groups.length > 1 && (
                  <h2 className="mb-4 text-xs font-medium uppercase tracking-luxe text-gold-600">
                    {category}
                  </h2>
                )}
                <div className="divide-y divide-line rounded-2xl border border-line bg-white">
                  {items.map((faq) => (
                    <details key={faq.id} className="group px-5 sm:px-6">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-espresso [&::-webkit-details-marker]:hidden">
                        <span>{faq.question}</span>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-warmgray transition-transform duration-200 group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="pb-5 pr-8">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-warmgray">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
