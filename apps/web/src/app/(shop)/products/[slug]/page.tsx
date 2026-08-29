import { Metadata } from 'next';
import { ProductClient } from './ProductClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oblintz.com';

interface ProductMeta {
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: { name: string };
  metaTitle: string | null;
  metaDesc: string | null;
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
      title: 'Produk Tidak Ditemukan - OBLINTZ',
      description: 'Produk yang Anda cari tidak ditemukan.',
    };
  }

  const title = product.metaTitle || `${product.name} - OBLINTZ`;
  const description =
    product.metaDesc ||
    product.description?.slice(0, 160) ||
    `Beli ${product.name} di OBLINTZ. Harga terbaik.`;
  const imageUrl = product.images?.[0] || `${SITE_URL}/og-product.png`;

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

export default function ProductPage() {
  return <ProductClient />;
}
