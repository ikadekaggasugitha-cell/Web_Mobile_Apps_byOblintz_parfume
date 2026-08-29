import sgMail from '@sendgrid/mail';
import { config } from '../config';

sgMail.setApiKey(config.sendgrid.apiKey);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  try {
    if (!config.sendgrid.apiKey || config.sendgrid.apiKey === '') {
      console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
      return true;
    }

    await sgMail.send({
      to,
      from: {
        email: config.sendgrid.fromEmail,
        name: config.sendgrid.fromName,
      },
      subject,
      html,
      replyTo: config.sendgrid.replyTo,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// ==================== TEMPLATES ====================

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Selamat Datang di OBLINTZ!',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6B46C1;">Selamat Datang di OBLINTZ! 🌸</h1>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Terima kasih telah bergabung dengan OBLINTZ, platform parfum premium terbaik di Indonesia.</p>
        <p>Temukan parfum sempurna yang mencerminkan gaya Anda melalui katalog kami atau quiz rekomendasi.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2026 OBLINTZ. All rights reserved.</p>
      </body>
      </html>
    `,
  };
}

export function resetPasswordEmail(name: string, resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset Password OBLINTZ',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6B46C1;">Reset Password</h1>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            Reset Password
          </a>
        </p>
        <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
        <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2026 OBLINTZ. All rights reserved.</p>
      </body>
      </html>
    `,
  };
}

export function otpEmail(name: string, otp: string): { subject: string; html: string } {
  return {
    subject: 'Kode Verifikasi OBLINTZ',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6B46C1;">Kode Verifikasi</h1>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Berikut adalah kode verifikasi Anda:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6B46C1;">${otp}</span>
        </div>
        <p>Kode ini kedaluwarsa dalam 5 menit.</p>
        <p>Jika Anda tidak meminta kode ini, abaikan email ini.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2026 OBLINTZ. All rights reserved.</p>
      </body>
      </html>
    `,
  };
}

export function orderConfirmationEmail(
  name: string,
  orderNumber: string,
  totalAmount: number,
  items: Array<{ name: string; quantity: number; price: number }>
): { subject: string; html: string } {
  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rp ${item.price.toLocaleString('id-ID')}</td>
        </tr>
      `
    )
    .join('');

  return {
    subject: `Konfirmasi Pesanan ${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6B46C1;">Pesanan Berhasil! 🎉</h1>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Pesanan Anda dengan nomor <strong>${orderNumber}</strong> telah berhasil dibuat.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Produk</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Harga</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold; color: #6B46C1;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>
        <p>Untuk menyelesaikan pembayaran, silakan lakukan pembayaran QRIS melalui link berikut.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2026 OBLINTZ. All rights reserved.</p>
      </body>
      </html>
    `,
  };
}
