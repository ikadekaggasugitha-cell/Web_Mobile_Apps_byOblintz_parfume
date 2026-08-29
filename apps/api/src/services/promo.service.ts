import prisma from '../config/database';

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  discount?: number;
  promoCodeId?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: any;
  minOrder: any;
  maxDiscount: any;
  usageLimit: number | null;
  usedCount: number;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}

export async function validatePromoCode(
  code: string,
  subtotal: number,
  shippingFee: number = 0
): Promise<PromoValidationResult> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    return { valid: false, error: 'Kode promo tidak ditemukan', errorCode: 'NOT_FOUND' };
  }

  if (promo.status !== 'ACTIVE') {
    return { valid: false, error: 'Kode promo tidak aktif', errorCode: 'PROMO_INACTIVE' };
  }

  if (promo.startDate && new Date() < promo.startDate) {
    return { valid: false, error: 'Kode promo belum berlaku', errorCode: 'PROMO_NOT_STARTED' };
  }

  if (promo.endDate && new Date() > promo.endDate) {
    return { valid: false, error: 'Kode promo sudah kedaluwarsa', errorCode: 'PROMO_EXPIRED' };
  }

  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    return { valid: false, error: 'Kode promo sudah mencapai batas penggunaan', errorCode: 'PROMO_LIMIT' };
  }

  if (promo.minOrder && subtotal < Number(promo.minOrder)) {
    return {
      valid: false,
      error: `Minimum order Rp ${Number(promo.minOrder).toLocaleString('id-ID')}`,
      errorCode: 'MIN_ORDER',
    };
  }

  const discount = calculateDiscount(promo, subtotal, shippingFee);

  return {
    valid: true,
    discount,
    promoCodeId: promo.id,
  };
}

export function calculateDiscount(
  promo: PromoCode,
  subtotal: number,
  shippingFee: number = 0
): number {
  let discount = 0;

  if (promo.type === 'PERCENTAGE') {
    discount = subtotal * (Number(promo.value) / 100);
    if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
      discount = Number(promo.maxDiscount);
    }
  } else if (promo.type === 'FIXED') {
    discount = Number(promo.value);
  } else if (promo.type === 'FREE_SHIPPING') {
    discount = shippingFee;
  }

  return discount;
}
