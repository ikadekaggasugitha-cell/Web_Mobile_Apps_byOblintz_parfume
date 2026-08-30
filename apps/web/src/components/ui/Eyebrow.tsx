import * as React from 'react';
import { cn } from '@/lib/utils';

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  /** `light` sits on ivory/sand; `dark` sits on burgundy/espresso surfaces. */
  tone?: 'light' | 'dark';
  /** Em-dash flanks — the `— LABEL —` editorial treatment. */
  flank?: boolean;
  as?: 'p' | 'span' | 'div';
}

/**
 * Letter-spaced uppercase label used above headings across the whole site.
 * Champagne on light surfaces, brighter champagne on dark ones.
 */
export function Eyebrow({
  children,
  className,
  tone = 'light',
  flank = true,
  as: Tag = 'p',
}: EyebrowProps) {
  return (
    <Tag
      className={cn(
        'text-xs font-medium uppercase tracking-luxe',
        tone === 'dark' ? 'text-gold-400' : 'text-gold-600',
        className
      )}
    >
      {flank && (
        <span aria-hidden="true" className="mr-2.5">
          —
        </span>
      )}
      {children}
      {flank && (
        <span aria-hidden="true" className="ml-2.5">
          —
        </span>
      )}
    </Tag>
  );
}
