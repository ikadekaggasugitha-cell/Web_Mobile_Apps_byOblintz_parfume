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

// Explicit origins from env (used as the strict allowlist in production).
const explicitOrigins = [
  ...(process.env.APP_URL || 'http://localhost:3000').split(','),
  ...(process.env.ADMIN_URL || 'http://localhost:3001').split(','),
]
  .map((o) => o.trim())
  .filter(Boolean);

// Matches localhost and private-LAN addresses (192.168.x, 10.x, 172.16–31.x) on
// any port. In development this lets any device on the same WiFi reach the API
// without hardcoding an IP into the CORS allowlist.
const lanOriginRegex =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

type CorsOriginResolver = (
  origin: string | undefined,
  cb: (err: Error | null, allow: boolean) => void
) => void;

const corsOrigin: string[] | CorsOriginResolver =
  nodeEnv === 'production'
    ? explicitOrigins
    : (origin, cb) => {
        // No Origin header = same-origin or server-to-server request; allow it.
        if (!origin || explicitOrigins.includes(origin) || lanOriginRegex.test(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      };

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
    origin: corsOrigin,
    credentials: true,
  },
};
