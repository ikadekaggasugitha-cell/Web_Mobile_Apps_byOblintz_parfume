import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  /** `dark` when rendered on a burgundy/espresso band. */
  tone?: 'light' | 'dark';
  /** Breadcrumb / actions rendered above the heading. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The consistent opening for every non-home page: an eyebrow, an editorial
 * Fraunces H1, and an optional lede. Replaces the ad-hoc bold-gray headings so
 * catalog, cart, checkout and account pages all share one voice.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
  children,
  className,
}: PageHeaderProps) {
  const dark = tone === 'dark';
  return (
    <div
      className={cn(
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl',
        className
      )}
    >
      {children}
      {eyebrow && (
        <Eyebrow tone={dark ? 'dark' : 'light'} flank={align === 'center'} className="mb-4">
          {eyebrow}
        </Eyebrow>
      )}
      <h1
        className={cn(
          'font-serif text-4xl font-medium leading-[1.06] tracking-[-0.01em] sm:text-5xl',
          dark ? 'text-ivory' : 'text-espresso'
        )}
      >
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            'mt-5 max-w-2xl text-base leading-relaxed sm:text-lg',
            align === 'center' && 'mx-auto',
            dark ? 'text-ivory/75' : 'text-warmgray'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
