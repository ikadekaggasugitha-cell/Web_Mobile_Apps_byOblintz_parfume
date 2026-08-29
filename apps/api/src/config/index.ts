import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Validate required secrets in production
if (nodeEnv === 'production') {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

export const config = {
  port: parseInt(process.env.API_PORT || '5000', 10),
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://oblintz:password@localhost:5432/oblintz',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (nodeEnv === 'production' ? '' : 'dev-access-secret-min-32-chars!!'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (nodeEnv === 'production' ? '' : 'dev-refresh-secret-min-32-chars!!'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  midtrans: {
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    webhookUrl: process.env.MIDTRANS_WEBHOOK_URL || 'http://localhost:5000/api/payments/webhook',
  },
  
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@oblintz.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'OBLINTZ',
    replyTo: process.env.SENDGRID_REPLY_TO || 'support@oblintz.com',
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10),
  },
  
  cors: {
    origin: [
      process.env.APP_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  },
};
