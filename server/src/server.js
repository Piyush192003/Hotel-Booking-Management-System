import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { config, isEmailConfigured } from './config/env.js';
import { startJobs } from './jobs/index.js';

async function main() {
  try {
    await connectDatabase();
    console.log(`[mongodb] connected → ${config.mongoUri}`);
  } catch (err) {
    console.error('[mongodb] connection failed:', err.message);
    console.error('Ensure MongoDB is running (or set MONGODB_URI to a MongoDB Atlas connection string).');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] Wanderlust API running on http://localhost:${config.port} (${config.env})`);
    if (config.razorpay.isConfigured) console.log('[payments] Razorpay: LIVE mode');
    else console.log('[payments] Razorpay keys missing → MOCK payment mode (development)');
    if (config.env !== 'production' && !isEmailConfigured) {
      console.log('[email] SMTP not configured → Ethereal preview inbox (dev). Codes also appear on the verify page; preview URLs are logged here.');
    }
  });

  startJobs();

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();