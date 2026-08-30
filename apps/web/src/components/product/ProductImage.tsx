'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  /** Size of the serif wordmark shown when no image is available. */
  fallbackClassName?: string;
}

/**
 * Product image with a graceful, on-brand fallback. Renders the OBLINTZ
 * wordmark on a warm surface whenever the source is missing or fails to load —
 * avoiding both `next/image` crashes and the browser's broken-image icon.
 */
export function ProductImage({
  src,
  alt,
  width = 480,
  height = 600,
  className,
  priority,
  unoptimized,
  fallbackClassName = 'text-2xl',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sand">
        <span
          aria-hidden="true"
          className={cn(
            'font-serif italic tracking-wide text-warmgray/50',
            fallbackClassName
          )}
        >
          OBLINTZ
        </span>
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
