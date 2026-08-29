'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingPage } from '@/components/ui/Loading';
import { ProductCard } from '@/components/product/ProductCard';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  images: string[];
  notes: string[];
  occasions: string[];
  avgRating: number;
  _count: { reviews: number };
  category: { name: string; slug: string };
  reviews: any[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: { name: string };
  _count: { reviews: number };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProduct = async () => {
      try {
        const response = await api.get(`/api/products/${params.slug}`, {
          signal: controller.signal,
        });
        setProduct(response.data.data);

        const relatedResponse = await api.get(
          `/api/products/${params.slug}/related`,
          { signal: controller.signal }
        );
        setRelated(relatedResponse.data.data);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Gagal memuat produk:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();

    return () => controller.abort();
  }, [params.slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      await api.post(
        '/api/cart/items',
        { productId: product.id, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Produk ditambahkan ke keranjang!');
    } catch (error) {
      console.error('Gagal menambahkan ke keranjang:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) return <LoadingPage />;
  if (!product) return <div className="py-12 text-center">Produk tidak ditemukan</div>;

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-500">
          Beranda
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-primary-500">
          Produk
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/categories/${product.category.slug}`}
          className="hover:text-primary-500"
        >
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            {product.images?.[selectedImage] ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                width={600}
                height={600}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-6xl">
                📷
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                    idx === selectedImage
                      ? 'border-primary-500'
                      : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary">{product.category.name}</Badge>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              {product.name}
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span className="text-yellow-500">★</span>
                <span>{product.avgRating}</span>
                <span>({product._count.reviews} ulasan)</span>
              </div>
              <span
                className={`text-sm font-medium ${
                  product.stock > 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {product.stock > 0
                  ? `Stok: ${product.stock} tersedia`
                  : 'Stok habis'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {product.comparePrice && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatCurrency(product.comparePrice)}
                </span>
                <span className="rounded bg-red-100 px-2 py-1 text-sm font-medium text-red-600">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-gray-600">
            <p>{product.description}</p>
          </div>

          {/* Notes */}
          {product.notes?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-900">
                Catatan Parfum
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note) => (
                  <Badge key={note} variant="outline">
                    {note}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Occasions */}
          {product.occasions?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-900">
                Cocok Untuk
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.occasions.map((occasion) => (
                  <Badge key={occasion} variant="secondary">
                    {occasion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                -
              </button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              isLoading={isAddingToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
            </Button>
          </div>

          {/* Gift wrap info */}
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p>🎁 Tersedia gift wrapping (+Rp 15.000/item)</p>
            <p>🚚 Gratis ongkir untuk pembelian di atas Rp 500.000</p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Ulasan Produk</h2>
        {product.reviews?.length === 0 ? (
          <p className="text-gray-500">Belum ada ulasan</p>
        ) : (
          <div className="space-y-4">
            {product.reviews?.map((review: any) => (
              <div key={review.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">
                    {'★'.repeat(review.rating)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {review.user.name}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Produk Terkait
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
