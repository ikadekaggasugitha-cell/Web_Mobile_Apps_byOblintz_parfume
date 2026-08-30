import * as React from 'react';
import { cn } from '@/lib/utils';

export type SectionTone = 'ivory' | 'sand' | 'burgundy' | 'oxblood' | 'espresso';

const TONE_CLASSES: Record<SectionTone, string> = {
  ivory: 'bg-ivory text-espresso',
  sand: 'bg-sand text-espresso',
  burgundy: 'bg-primary-600 text-ivory',
  oxblood: 'bg-primary-800 text-ivory',
  espresso: 'bg-espresso text-ivory',
};

interface SectionProps {
  children: React.ReactNode;
  /** Surface colour — drives background + default text colour. */
  tone?: SectionTone;
  /** Vertical rhythm. `md` is the default section spacing. */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Wrap children in the standard centered container. */
  container?: boolean;
  className?: string;
  containerClassName?: string;
  id?: string;
  as?: 'section' | 'div' | 'header' | 'footer';
}

const SPACING: Record<NonNullable<SectionProps['spacing']>, string> = {
  none: '',
  sm: 'py-10 sm:py-14',
  md: 'py-20 sm:py-28',
  lg: 'py-24 sm:py-32',
};

/**
 * A full-width band with a warm surface tone and consistent vertical rhythm.
 * Alternating `ivory`/`sand`/`burgundy` Sections create the editorial cadence
 * that ties every page to the same brand system.
 */
export function Section({
  children,
  tone = 'ivory',
  spacing = 'md',
  container = true,
  className,
  containerClassName,
  id,
  as: Tag = 'section',
}: SectionProps) {
  return (
    <Tag id={id} className={cn(TONE_CLASSES[tone], SPACING[spacing], className)}>
      {container ? (
        <div className={cn('container mx-auto px-4 sm:px-6', containerClassName)}>
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  );
}
