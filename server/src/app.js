import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { config, isCloudinaryConfigured } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Behind a reverse proxy (Render/Heroku/Nginx) so req.ip & secure cookies work
app.set('trust proxy', 1);

app.disable('x-powered-by');

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(
  cors({
    origin(configOrigin, callback) {
      const allowed = [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];
      // In development, allow any localhost origin (Vite may fall back to 5174+ when 5173 is busy)
      const isLocalDev =
        !config.isProduction &&
        !!configOrigin &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(configOrigin);
      if (!configOrigin || allowed.includes(configOrigin) || isLocalDev) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Request logging
if (!config.isProduction) app.use(morgan('dev'));
else app.use(morgan('combined'));

// Serve local dev uploads (only used when Cloudinary is NOT configured)
if (!isCloudinaryConfigured) {
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
}

// Global rate limiter (webhooks/auth respected below)
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// Health
app.get('/', (req, res) => res.json({ success: true, message: 'Wanderlust API', data: {} }));

// Production: serve the built client (single-service deployment)
if (config.isProduction) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — any non-API GET serves the React app
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 + central error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;