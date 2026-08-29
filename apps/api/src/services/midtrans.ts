import crypto from 'crypto';
import { config } from '../config';

const MIDTRANS_API_URL = config.midtrans.isProduction
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

function getAuthHeader(): string {
  const credentials = `${config.midtrans.serverKey}:`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

interface MidtransChargePayload {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  payment_type: string;
  customer_details?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  callbacks?: {
    finish?: string;
  };
}

interface MidtransChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  qr_code?: string;
  deeplink?: string;
  redirect_url?: string;
  actions?: {
    name: string;
    method: string;
    url: string;
  }[];
  expire_time?: string;
  finish_redirect_url?: string;
  merchant_id?: string;
  va_numbers?: { bank: string; va_number: string }[];
  payment_code?: string;
  biller_code?: string;
  bill_key?: string;
}

export async function createMidtransQRIS(
  orderId: string,
  grossAmount: number,
  customer?: { name?: string; email?: string; phone?: string }
): Promise<MidtransChargeResponse> {
  const payload: MidtransChargePayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    payment_type: 'qris',
    customer_details: customer ? {
      first_name: customer.name || 'Customer',
      email: customer.email,
      phone: customer.phone,
    } : undefined,
    callbacks: {
      finish: `${config.frontendUrl}/payment/callback`,
    },
  };

  const response = await fetch(`${MIDTRANS_API_URL}/v1/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as MidtransChargeResponse;

  if (!response.ok) {
    throw new Error(data.status_message || 'Midtrans charge failed');
  }

  return data;
}

export async function getMidtransStatus(
  orderId: string
): Promise<MidtransChargeResponse> {
  const response = await fetch(
    `${MIDTRANS_API_URL}/v2/${orderId}/status`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': getAuthHeader(),
      },
    }
  );

  const data = await response.json() as MidtransChargeResponse;

  if (!response.ok) {
    throw new Error(data.status_message || 'Failed to get payment status');
  }

  return data;
}

export function verifyMidtransSignature(body: any): boolean {
  if (!config.midtrans.serverKey) return true; // Skip in dev without keys

  const { order_id, status_code, gross_amount, signature_key } = body;
  const serverKey = config.midtrans.serverKey;

  const expectedSignature = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');

  return signature_key === expectedSignature;
}
