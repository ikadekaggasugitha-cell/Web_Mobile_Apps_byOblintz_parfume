import { z } from 'zod';

/**
 * Coerce empty strings to `undefined` before validation.
 *
 * Admin forms (react-hook-form) submit unfilled optional fields as `''` rather
 * than omitting them. A bare `z.string().url().optional()` rejects `''` because
 * an empty string is neither `undefined` nor a valid URL — which surfaced as
 * "Gagal menyimpan" when saving a banner with an empty Link. Wrapping the schema
 * here makes the API tolerant of that common client behaviour.
 */
export const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Optional absolute URL that treats `''` as "not provided". */
export const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

/**
 * Accepts either an absolute URL (external image) or an app-relative path such
 * as an uploaded `/uploads/images/x.png`. Uploaded media is stored relative so
 * it stays portable across hosts, so a strict `.url()` would wrongly reject it.
 */
const isImageRef = (value: string) => {
  if (value.startsWith('/')) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/** Required image reference: absolute URL or app-relative upload path. */
export const imageRef = z
  .string()
  .refine(isImageRef, { message: 'URL gambar tidak valid' });

/** Optional image reference that treats `''` as "not provided". */
export const optionalImageRef = z.preprocess(
  emptyToUndefined,
  imageRef.optional()
);

/** Optional trimmed string that treats `''` as "not provided". */
export const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
