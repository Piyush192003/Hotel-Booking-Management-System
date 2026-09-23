import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config, isRazorpayConfigured } from '../config/env.js';
import { PAYMENT_PROVIDERS } from '../utils/constants.js';

/**
 * JWT helpers. Refresh tokens are stored in an httpOnly cookie and issued
 * with a unique `jti` so they can be selectively revoked on logout.
 * (In-memory revocation list — suitable for a single-instance deployment.)
 */
const blacklist = new Set();
const BLACKLIST_MAX = 5000;

class TokenService {
  /** `tv` (token version) lets us invalidate every session by bumping the user. */
  generateAccessToken(user) {
    const jti = crypto.randomUUID();
    return jwt.sign({ role: user.role, jti, tv: user.tokenVersion || 0 }, config.jwt.accessSecret, {
      subject: String(user._id),
      expiresIn: config.jwt.accessExpiresIn,
    });
  }

  generateRefreshToken(user) {
    const jti = crypto.randomUUID();
    return jwt.sign({ role: user.role, jti, tv: user.tokenVersion || 0 }, config.jwt.refreshSecret, {
      subject: String(user._id),
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  async verifyRefreshToken(token) {
    const payload = jwt.verify(token, config.jwt.refreshSecret);
    if (this.isBlacklisted('refresh', payload.jti)) {
      throw new Error('refresh_token_revoked');
    }
    return payload;
  }

  isBlacklisted(kind, jti) {
    return blacklist.has(`${kind}:${jti}`);
  }

  async revoke(kind, jti) {
    if (!jti) return;
    blacklist.add(`${kind}:${jti}`);
    if (blacklist.size > BLACKLIST_MAX) {
      for (const item of [...blacklist].slice(0, blacklist.size - BLACKLIST_MAX)) blacklist.delete(item);
    }
  }

  async revokeRefreshForUser(userId) {
    // jtis are not stored per user; log-out revokes the presented token.
  }
}

export const tokenService = new TokenService();
export { TokenService, config, isRazorpayConfigured, PAYMENT_PROVIDERS };