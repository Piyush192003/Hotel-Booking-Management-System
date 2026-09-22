import { isCloudinaryConfigured, config } from '../config/env.js';
import path from 'node:path';
import fs from 'node:fs';

/** Pick a weight for a numeric env value or return fallback. */
export function envNumber(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function ensureUploadDir() {
  const dir = path.resolve(process.cwd(), config.uploads.dir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export { isCloudinaryConfigured };