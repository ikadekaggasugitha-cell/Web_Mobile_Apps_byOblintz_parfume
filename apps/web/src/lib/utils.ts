import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrency, formatDate } from '@oblintz/shared';

/**
 * Product images arrive from the API in two shapes depending on the endpoint:
 * a bare URL string, or an object `{ url, alt, isPrimary }`. Normalize either
 * into a plain URL string so `next/image` never receives an object (which
 * throws). Returns `null` when there is no usable image.
 */
type ImageLike = string | { url?: string | null } | null | undefined;

export function resolveImageUrl(image: ImageLike): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image || null;
  return image.url || null;
}

/** Normalize a product's `images` field to a flat array of URL strings. */
export function resolveImages(images: ImageLike[] | null | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map(resolveImageUrl)
    .filter((url): url is string => Boolean(url));
}

/**
 * Fragrance notes arrive either as a flat `string[]` or a structured object
 * `{ top, middle, base }`. Flatten to a de-duplicated string list.
 */
type NotesLike =
  | string[]
  | { top?: string[]; middle?: string[]; base?: string[] }
  | null
  | undefined;

export function resolveNotes(notes: NotesLike): string[] {
  if (!notes) return [];
  if (Array.isArray(notes)) return notes.filter(Boolean);
  const flat = [
    ...(notes.top ?? []),
    ...(notes.middle ?? []),
    ...(notes.base ?? []),
  ].filter(Boolean);
  return Array.from(new Set(flat));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}
