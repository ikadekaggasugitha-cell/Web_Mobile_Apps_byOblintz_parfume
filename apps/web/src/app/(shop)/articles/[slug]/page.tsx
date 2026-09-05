import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiBase';
import { JsonLd } from '@/components/seo/JsonLd';

const API_URL = getApiBaseUrl();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  imageUrl: string | null;
  author: string;
  status: string;
  metaTitle: string | null;
  metaDesc: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_URL}/api/articles/${slug}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
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

const toAbsolute = (u: string) =>
  u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: 'Artikel Tidak Ditemukan',
      description: 'Artikel yang Anda cari tidak ditemukan.',
    };
  }

  const title = article.metaTitle || article.title;
  const description =
    article.metaDesc ||
    article.excerpt ||
    article.content.slice(0, 160);
  const imageUrl = article.imageUrl
    ? toAbsolute(article.imageUrl)
    : `${SITE_URL}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/articles/${article.slug}`,
      siteName: 'OBLINTZ',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title }],
      type: 'article',
      locale: 'id_ID',
      publishedTime: article.publishedAt || article.createdAt,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: `/articles/${article.slug}` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);

  if (!article) notFound();

  const paragraphs = article.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.content.slice(0, 200),
    image: article.imageUrl ? toAbsolute(article.imageUrl) : undefined,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'OBLINTZ',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: `${SITE_URL}/articles/${article.slug}`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Jurnal', item: `${SITE_URL}/articles` },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${SITE_URL}/articles/${article.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-warmgray transition-colors hover:text-espresso"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Jurnal
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-luxe text-gold-600">
            <time>{formatDate(article.publishedAt || article.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{article.author}</span>
          </div>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.08] tracking-[-0.01em] text-espresso sm:text-5xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-warmgray">
              {article.excerpt}
            </p>
          )}
        </header>

        {article.imageUrl && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl bg-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="mt-10 space-y-6">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="whitespace-pre-line text-base leading-[1.85] text-espresso/90"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </>
  );
}
