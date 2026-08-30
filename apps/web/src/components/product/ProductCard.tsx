import { memo } from 'react';
import Link from 'next/link';
import { formatCurrency, resolveImageUrl, resolveNotes } from '@/lib/utils';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number | string;
    comparePrice?: number | string | null;
    images: Array<string | { url?: string | null }>;
    notes?: string[] | { top?: string[]; middle?: string[]; base?: string[] };
    category?: { name: string };
    _count?: { reviews: number };
  };
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const price = Number(product.price);
  const comparePrice = product.comparePrice != null ? Number(product.comparePrice) : null;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : 0;

  const imageUrl = resolveImageUrl(product.images?.[0]);
  // Restrained, comma-separated preview of the fragrance notes.
  const notesPreview = resolveNotes(product.notes).slice(0, 3).join(' · ');

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus-visible:outline-none"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-sand transition-colors duration-300 group-hover:border-gold-300 group-focus-visible:ring-2 group-focus-visible:ring-primary-500 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ivory">
        <ProductImage
          src={imageUrl}
          alt={product.name}
          width={480}
          height={600}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
            −{discount}%
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {product.category && (
          <p className="text-xs uppercase tracking-luxe text-gold-600">
            {product.category.name}
          </p>
        )}
        <h3 className="font-serif text-lg font-medium leading-snug text-espresso transition-colors group-hover:text-primary-600">
          {product.name}
        </h3>
        {notesPreview && (
          <p className="truncate text-sm text-warmgray">{notesPreview}</p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-sm font-semibold text-espresso">
            {formatCurrency(price)}
          </span>
          {comparePrice && (
            <span className="text-xs text-warmgray/70 line-through">
              {formatCurrency(comparePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});
