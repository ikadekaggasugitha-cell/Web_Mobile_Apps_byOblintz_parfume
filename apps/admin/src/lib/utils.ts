import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getApiBaseUrl } from './apiBase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrency, formatDate } from '@oblintz/shared';

/**
 * Uploaded media is stored as an API-relative path (e.g. `/uploads/images/x.png`).
 * The API serves it, not the admin app, so prefix relative upload paths with the
 * API base URL for previews. Absolute URLs and data URIs pass through untouched.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${getApiBaseUrl()}${url}`;
  return url;
}
