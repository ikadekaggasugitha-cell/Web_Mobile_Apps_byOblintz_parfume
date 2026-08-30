import { Metadata } from 'next';
import { ProductClient } from './ProductClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { resolveImages } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

interface ProductMeta {
  name: string;
  slug: string;
  description: string;
  price: number | string;
  stock: number;
  images: Array<string | { url?: string | null }>;
  category: { name: string };
  metaTitle: string | null;
  metaDesc: string | null;
  avgRating: number;
  reviewPagination: { total: number };
}

async function getProduct(slug: string): Promise<ProductMeta | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Produk Tidak Ditemukan',
      description: 'Produk yang Anda cari tidak ditemukan.',
    };
  }

  // Bare title — the root layout's template appends " | OBLINTZ".
  const title = product.metaTitle || product.name;
  const description =
    product.metaDesc ||
    product.description?.slice(0, 160) ||
    `Beli ${product.name} di OBLINTZ. Harga terbaik.`;
  const toAbsolute = (u: string) =>
    u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
  const productImages = resolveImages(product.images).map(toAbsolute);
  const imageUrl = productImages[0] || `${SITE_URL}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.slug}`,
      siteName: 'OBLINTZ',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
      type: 'website',
      locale: 'id_ID',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `/products/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  // Reuses the same cached fetch as generateMetadata (Next dedupes by URL).
  const product = await getProduct(params.slug);

  const reviewCount = product?.reviewPagination?.total ?? 0;

  const productJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description:
          product.metaDesc || product.description?.slice(0, 300) || product.name,
        image: resolveImages(product.images).length
          ? resolveImages(product.images).map((u) =>
              u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`
            )
          : undefined,
        category: product.category?.name,
        brand: { '@type': 'Brand', name: 'OBLINTZ' },
        // Only emit AggregateRating when there are real approved reviews —
        // Google rejects rating markup with a zero count.
        ...(reviewCount > 0 && product.avgRating > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.avgRating,
                reviewCount,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/products/${product.slug}`,
          priceCurrency: 'IDR',
          price: product.price,
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'OBLINTZ' },
        },
      }
    : null;

  const breadcrumbJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Produk',
            item: `${SITE_URL}/products`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.name,
            item: `${SITE_URL}/products/${product.slug}`,
          },
        ],
      }
    : null;

  return (
    <>
      {productJsonLd && <JsonLd data={productJsonLd} />}
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}
      <ProductClient />
    </>
  );
}
