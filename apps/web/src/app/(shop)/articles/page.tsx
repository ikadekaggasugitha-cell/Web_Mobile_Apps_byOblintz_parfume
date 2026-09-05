import { Metadata } from 'next';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/apiBase';
import { PageHeader } from '@/components/layout/PageHeader';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

export const metadata: Metadata = {
  title: 'Jurnal',
  description:
    'Kisah, panduan, dan inspirasi seputar dunia parfum dari OBLINTZ — cara memilih aroma, merawat parfum, dan menemukan signature scent Anda.',
  alternates: { canonical: '/articles' },
};

interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  createdAt: string;
}

async function getArticles(): Promise<ArticleListItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/articles?limit=50`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.articles ?? [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-10 border-b border-line pb-8">
        <PageHeader
          eyebrow="Jurnal"
          title="Cerita di Balik Aroma"
          description="Panduan, inspirasi, dan kisah seputar dunia parfum untuk membantu Anda menemukan wewangian yang tepat."
        />
      </div>

      {articles.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="font-serif text-2xl font-medium text-espresso">
            Belum Ada Artikel
          </h2>
          <p className="mt-2 text-warmgray">
            Nantikan cerita dan panduan terbaru dari kami.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-card"
            >
              <div className="aspect-[16/10] overflow-hidden bg-sand">
                {article.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-serif text-2xl italic tracking-wide text-warmgray/40">
                      OBLINTZ
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <time className="text-xs uppercase tracking-luxe text-gold-600">
                  {formatDate(article.createdAt)}
                </time>
                <h2 className="mt-3 font-serif text-xl font-medium leading-snug text-espresso transition-colors group-hover:text-primary-700">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-warmgray">
                    {article.excerpt}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-luxe text-primary-700">
                  Baca Selengkapnya
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
