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

/** Optional trimmed string that treats `''` as "not provided". */
export const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
