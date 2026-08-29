import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice?: number | null;
    images: string[];
    category?: { name: string };
    _count?: { reviews: number };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={400}
            height={400}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            📷
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {product.category && (
          <p className="text-xs text-gray-500">{product.category.name}</p>
        )}
        <h3 className="font-medium text-gray-900 group-hover:text-primary-500 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
          {discount > 0 && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
              -{discount}%
            </span>
          )}
        </div>
        {product._count && product._count.reviews > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>★</span>
            <span>{product._count.reviews} ulasan</span>
          </div>
        )}
      </div>
    </Link>
  );
}
