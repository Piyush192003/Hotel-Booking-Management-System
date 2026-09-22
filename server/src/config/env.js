import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';

const requiredInProduction = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

if (env === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

export const config = {
  env,
  isProduction: env === 'production',
  isDevelopment: env !== 'production',

  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || `http://localhost:${parseInt(process.env.PORT || '5000', 10)}`,

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wanderlust',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  refreshCookieName: 'wl_refresh_token',
  accessCookieName: 'wl_access_token',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Wanderlust <no-reply@wanderlust.dev>',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    get isConfigured() {
      return Boolean(this.keyId && this.keySecret);
    },
  },

  mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
  },
};

export const isRazorpayConfigured = config.razorpay.isConfigured;
export const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);

export const isEmailConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);