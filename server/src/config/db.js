import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => {
    // Logged by caller to keep test output clean.
  });
  mongoose.connection.on('error', (err) => {
    console.error('[mongodb] connection error:', err.message);
  });
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export async function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}