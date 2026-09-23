import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { hashToken } from '../utils/generate.js';
import { tokenService } from '../services/TokenService.js';
import { ROLES } from '../utils/constants.js';

/**
 * Authenticates a request from either the Authorization header (Bearer)
 * or the httpOnly access-token cookie.
 */
export async function authenticateUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    let token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) token = req.cookies?.[config.accessCookieName];

    if (!token) {
      return next(ApiError.unauthorized('Please log in to access this resource'));
    }

    // Retrieve the jti blacklist check for that token version.
    const payload = jwt.verify(token, config.jwt.accessSecret);
    if (tokenService.isBlacklisted('access', payload.jti)) {
      return next(ApiError.unauthorized('Session has expired, please log in again'));
    }

    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user) return next(ApiError.unauthorized('Account no longer exists'));
    if (user.isBlocked) {
      return next(ApiError.forbidden('Your account has been blocked. Contact support.'));
    }
    // "Log out of all devices" bumps tokenVersion — older tokens stop working.
    if (Number(payload.tv ?? 0) !== Number(user.tokenVersion ?? 0)) {
      return next(ApiError.unauthorized('You were signed out of this device. Please log in again.'));
    }
    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('Session expired, please log in again'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized('Invalid token'));
    }
    return next(err);
  }
}

export function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.[config.accessCookieName];
  if (!token) return next();
  jwt.verify(token, config.jwt.accessSecret, async (err, payload) => {
    if (err) return next();
    try {
      const user = await User.findById(payload.sub);
      if (!user || user.isBlocked) return next();
      req.user = user;
    } catch {
      /* leave unauthenticated */
    }
    return next();
  });
}

/** Restricts the current user to one of the allowed roles. */
export function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission for this action'));
    }
    return next();
  };
}

/** Ensures the current user owns the resource. Checker receives req and must return the owner id. */
export function authorizeResourceOwner(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const ownerId = await getOwnerId(req);
    if (String(ownerId) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
      return next(ApiError.forbidden('You do not own this resource'));
    }
    return next();
  };
}

/** Token used for email verification / password reset fingerprinting. */
export const hashEmailToken = hashToken;

export default authenticateUser;