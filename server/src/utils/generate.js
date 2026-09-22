import crypto from 'node:crypto';

/** URL-safe slug from a name. */
export function generateSlug(name) {
  const base = String(name)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

/** Human-friendly unique booking number: WL-<YYYYMMDD>-<6 chars>. */
export function generateBookingNumber(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `WL-${y}${m}${d}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOtp(length = 6) {
  return crypto
    .randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}

export function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  if (!domain) return email;
  return `${user[0]}${'*'.repeat(Math.max(user.length - 2, 1))}${user[user.length - 1]}@${domain}`;
}