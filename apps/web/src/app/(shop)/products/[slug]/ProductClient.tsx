'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, resolveImages, resolveNotes } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LoadingPage } from '@/components/ui/Loading';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductImage } from '@/components/product/ProductImage';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  user: { name: string };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  comparePrice?: number | string | null;
  stock: number;
  images: Array<string | { url?: string | null }>;
  notes: string[] | { top?: string[]; middle?: string[]; base?: string[] };
  occasions: string[];
  avgRating: number;
  _count: { reviews: number };
  category: { name: string; slug: string };
  reviews: Review[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: Array<string | { url?: string | null }>;
  category: { name: string };
  _count: { reviews: number };
}

export function ProductClient() {
  const params = useParams();
  const router = useRouter();
  const { toasts, success, error: showError } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
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
        setIsError(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Gagal memuat produk:', err);
          setIsError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();

    return () => controller.abort();
  }, [params.slug]);

  const handleAddToCart = useCallback(async () => {
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

      success('Produk ditambahkan ke keranjang!');
    } catch (err) {
      console.error('Gagal menambahkan ke keranjang:', err);
      showError('Gagal menambahkan ke keranjang');
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, quantity, router, success, showError]);

  const incrementQuantity = useCallback(() => {
    if (product) {
      setQuantity((prev) => Math.min(product.stock, prev + 1));
    }
  }, [product]);

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(1, prev - 1));
  }, []);

  const price = product ? Number(product.price) : 0;
  const comparePrice =
    product?.comparePrice != null ? Number(product.comparePrice) : null;

  const discount = useMemo(
    () =>
      comparePrice && comparePrice > price
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : 0,
    [comparePrice, price]
  );

  const images = useMemo(() => resolveImages(product?.images), [product]);
  const notes = useMemo(() => resolveNotes(product?.notes), [product]);

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl font-medium text-espresso">Gagal Memuat Produk</h1>
        <p className="mt-2 text-warmgray">Terjadi kesalahan saat memuat detail produk</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    );
  }
  if (!product)
    return (
      <div className="py-16 text-center font-serif text-xl italic text-warmgray">
        Produk tidak ditemukan
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <ToastContainer toasts={toasts} />

      <nav className="mb-8 text-xs uppercase tracking-luxe text-warmgray" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-primary-700">
          Beranda
        </Link>
        <span className="mx-2 text-line" aria-hidden="true">/</span>
        <Link href="/products" className="transition-colors hover:text-primary-700">
          Koleksi
        </Link>
        <span className="mx-2 text-line" aria-hidden="true">/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="transition-colors hover:text-primary-700"
        >
          {product.category.name}
        </Link>
        <span className="mx-2 text-line" aria-hidden="true">/</span>
        <span className="text-espresso">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-sand">
            <ProductImage
              src={images[selectedImage]}
              alt={product.name}
              width={600}
              height={600}
              priority
              fallbackClassName="text-4xl"
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    idx === selectedImage
                      ? 'border-primary-600'
                      : 'border-line'
                  }`}
                  aria-label={`Lihat gambar ${idx + 1}`}
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

        <div className="space-y-7">
          <div>
            <Eyebrow className="mb-3">{product.category.name}</Eyebrow>
            <h1 className="font-serif text-4xl font-medium leading-tight tracking-[-0.01em] text-espresso">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-warmgray">
                <span className="text-gold-400" aria-hidden="true">★</span>
                <span className="font-medium text-espresso">{product.avgRating}</span>
                <span>({product._count.reviews} ulasan)</span>
              </div>
              <span aria-hidden="true" className="text-line">|</span>
              <span
                className={`text-sm font-medium ${
                  product.stock > 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {product.stock > 0
                  ? `${product.stock} tersedia`
                  : 'Stok habis'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-serif text-3xl font-medium text-espresso">
              {formatCurrency(price)}
            </span>
            {comparePrice && (
              <>
                <span className="text-lg text-warmgray/70 line-through">
                  {formatCurrency(comparePrice)}
                </span>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-sm font-medium text-primary-700">
                  −{discount}%
                </span>
              </>
            )}
          </div>

          <p className="max-w-prose leading-relaxed text-warmgray">
            {product.description}
          </p>

          {notes.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs uppercase tracking-luxe text-gold-600">
                Catatan Parfum
              </h3>
              <div className="flex flex-wrap gap-2">
                {notes.map((note) => (
                  <Badge key={note} variant="outline">
                    {note}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {product.occasions?.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs uppercase tracking-luxe text-gold-600">
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

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center rounded-[10px] border border-line">
              <button
                onClick={decrementQuantity}
                className="px-4 py-2.5 text-espresso transition-colors hover:bg-sand"
                aria-label="Kurangi jumlah"
              >
                −
              </button>
              <span className="px-4 py-2.5 font-medium text-espresso" aria-label={`Jumlah: ${quantity}`}>{quantity}</span>
              <button
                onClick={incrementQuantity}
                className="px-4 py-2.5 text-espresso transition-colors hover:bg-sand"
                aria-label="Tambah jumlah"
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

          <div className="space-y-1.5 rounded-xl border border-line bg-sand p-4 text-sm text-warmgray">
            <p>Tersedia gift wrapping elegan (+Rp 15.000/item)</p>
            <p>Gratis ongkir untuk pembelian di atas Rp 500.000</p>
          </div>
        </div>
      </div>

      <div className="mt-20 border-t border-line pt-12">
        <h2 className="font-serif text-2xl font-medium text-espresso sm:text-3xl">
          Ulasan Produk
        </h2>
        {product.reviews?.length === 0 ? (
          <p className="mt-4 font-serif text-lg italic text-warmgray">
            Belum ada ulasan untuk parfum ini.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {product.reviews?.map((review: any) => (
              <div key={review.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="text-gold-400" aria-hidden="true">
                    {'★'.repeat(review.rating)}
                  </span>
                  <span className="text-sm font-medium text-espresso">
                    {review.user.name}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-warmgray">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-20 border-t border-line pt-12">
          <h2 className="font-serif text-2xl font-medium text-espresso sm:text-3xl">
            Anda Mungkin Juga Suka
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
