/**
 * Single source of truth for promo-code validation & discount calculation.
 * Used by both checkout preview and the actual checkout so the discount shown
 * to the user is exactly the discount applied when the order is created.
 */

// Numeric fields are typed loosely so database `Decimal` values (which stringify
// via toString) are accepted alongside plain numbers/strings.
type Numeric = number | string | { toString(): string };

export interface PromoLike {
  status: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  minOrder?: Numeric | null;
  type: string;
  value: Numeric;
  maxDiscount?: Numeric | null;
}

export interface PromoEvaluation {
  applicable: boolean;
  discount: number;
}

/**
 * Evaluate a promo against a cart subtotal.
 * @param promo         the promo record (or null/undefined if not found)
 * @param subtotal      cart subtotal before discount
 * @param shippingFee   shipping fee (used by FREE_SHIPPING promos)
 * @param now           current time (injectable for testing)
 */
export function evaluatePromo(
  promo: PromoLike | null | undefined,
  subtotal: number,
  shippingFee: number,
  now: Date = new Date()
): PromoEvaluation {
  if (!promo || promo.status !== 'ACTIVE') {
    return { applicable: false, discount: 0 };
  }
  if (promo.startDate && now < new Date(promo.startDate)) {
    return { applicable: false, discount: 0 };
  }
  if (promo.endDate && now > new Date(promo.endDate)) {
    return { applicable: false, discount: 0 };
  }
  if (promo.usageLimit && (promo.usedCount ?? 0) >= promo.usageLimit) {
    return { applicable: false, discount: 0 };
  }
  if (promo.minOrder && subtotal < Number(promo.minOrder)) {
    return { applicable: false, discount: 0 };
  }

  let discount = 0;
  if (promo.type === 'PERCENTAGE') {
    discount = subtotal * (Number(promo.value) / 100);
    if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
      discount = Number(promo.maxDiscount);
    }
  } else if (promo.type === 'FIXED') {
    // Never discount more than the subtotal.
    discount = Math.min(Number(promo.value), subtotal);
  } else if (promo.type === 'FREE_SHIPPING') {
    discount = shippingFee;
  }

  return { applicable: true, discount };
}
