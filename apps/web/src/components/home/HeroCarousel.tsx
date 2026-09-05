'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Hero } from './Hero';

interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  link?: string | null;
  position?: string;
}

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 50;

/**
 * CMS-driven hero. Renders the active banners managed in the admin panel as a
 * full-bleed carousel. Falls back to the art-directed static <Hero /> whenever
 * there are no banners to show (empty, loading-then-empty, or error) so the
 * home page never renders a broken or empty stage.
 */
export function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isPaused = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await api.get('/api/banners', { signal: controller.signal });
        const data: Banner[] = response.data.data ?? [];
        // Only banners meant for the home stage (default position is 'home').
        const homeBanners = data.filter((b) => !b.position || b.position === 'home');
        setBanners(homeBanners);
      } catch (err: any) {
        if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          setBanners([]);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent((prev) => {
      const count = banners.length;
      if (count === 0) return prev;
      return ((index % count) + count) % count;
    });
  }, [banners.length]);

  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  // Auto-advance while there is more than one slide.
  useEffect(() => {
    if (banners.length <= 1) return;

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        if (!isPaused.current) {
          setCurrent((c) => (c + 1) % banners.length);
        }
      }, AUTOPLAY_MS);
    };

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  // Pause autoplay on hover (desktop) or touch (mobile)
  const handleMouseEnter = useCallback(() => {
    isPaused.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isPaused.current = false;
  }, []);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isPaused.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only trigger swipe if horizontal movement is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          next();
        } else {
          prev();
        }
      }

      // Resume autoplay after swipe
      setTimeout(() => {
        isPaused.current = false;
      }, 3000);
    },
    [next, prev]
  );

  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // While loading, hold the layout with the static hero to avoid a flash.
  if (isLoading) return <Hero />;

  // No CMS banners → keep the crafted static hero.
  if (banners.length === 0) return <Hero />;

  return (
    <section
      className="relative bg-primary-900"
      aria-roledescription="carousel"
      aria-label="Banner promosi"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9] lg:aspect-[24/9]">
        {banners.map((banner, index) => {
          const isActive = index === current;

          const content = (
            <>
              <BannerImage src={banner.imageUrl} alt={banner.title} priority={index === 0} />

              {/* Legibility scrim */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-primary-950/25 to-transparent"
              />

              {/* Copy */}
              <div className="absolute inset-0 flex items-end">
                <div className="container mx-auto px-4 pb-14 sm:px-6 sm:pb-16 lg:pb-20">
                  <div className="max-w-xl animate-fade-up">
                    <h2 className="font-serif text-3xl font-medium leading-[1.08] tracking-[-0.01em] text-ivory sm:text-4xl lg:text-5xl">
                      {banner.title}
                    </h2>
                    {banner.subtitle && (
                      <p className="mt-3 max-w-md text-base leading-relaxed text-ivory/80 sm:mt-4 sm:text-lg">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.link && (
                      <span className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-ivory px-7 text-sm font-medium text-primary-800 transition-colors duration-200 group-hover:bg-white">
                        Selengkapnya
                        <ArrowRight
                          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          );

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} dari ${banners.length}`}
            >
              {banner.link ? (
                <Link href={banner.link} className="group block h-full w-full">
                  {content}
                </Link>
              ) : (
                <div className="group block h-full w-full">{content}</div>
              )}
            </div>
          );
        })}

        {/* Controls — only when there is more than one banner */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Banner sebelumnya"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary-950/40 text-ivory backdrop-blur transition-colors hover:bg-primary-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:left-5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Banner berikutnya"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary-950/40 text-ivory backdrop-blur transition-colors hover:bg-primary-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:right-5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ke banner ${index + 1}`}
                  aria-current={index === current}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current
                      ? 'w-6 bg-ivory'
                      : 'w-2 bg-ivory/50 hover:bg-ivory/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** Full-bleed banner image with an on-brand fallback surface on load failure. */
function BannerImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-primary-800 to-primary-900">
        <span className="font-serif text-3xl italic tracking-wide text-ivory/40">
          OBLINTZ
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
