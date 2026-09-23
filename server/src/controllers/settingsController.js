import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import SettingsService from '../services/SettingsService.js';
import platformSettings from '../services/PlatformSettingsService.js';
import auditLog from '../services/AuditLogService.js';
import { config } from '../config/env.js';
import { ROLES } from '../utils/constants.js';

const CLEAR_COOKIE_OPTS = { path: '/' };

/** GET /api/settings — profile, preferences and role-specific context. */
export const getSettings = asyncHandler(async (req, res) => {
  const payload = await SettingsService.getForUser(req.user);
  return ApiResponse.send(
    res,
    ApiResponse.ok({ ...payload, security: SettingsService.securityInfo(req.user) }, 'Settings loaded'),
  );
});

/** PATCH /api/settings — profile + preferences (sections are role-scoped inside the service). */
export const updateSettings = asyncHandler(async (req, res) => {
  const user = await SettingsService.update(req.user._id, req.body);
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON() }, 'Settings saved'));
});

/** GET /api/settings/security — login history + account status metadata. */
export const getSecurity = asyncHandler(async (req, res) => {
  return ApiResponse.send(res, ApiResponse.ok({ security: SettingsService.securityInfo(req.user) }, 'Security information'));
});

/**
 * POST /api/settings/logout-all — invalidates every other session.
 * The calling device receives a fresh token pair so it stays signed in.
 */
export const logoutAllDevices = asyncHandler(async (req, res) => {
  const { user, tokens } = await SettingsService.logoutAllDevices(req.user._id);
  res.cookie(config.refreshCookieName, tokens.refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(config.accessCookieName, tokens.accessToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  await auditLog.record({
    userId: user._id,
    email: user.email,
    action: 'sessions_revoked',
    resource: 'user',
    resourceId: user._id,
    metadata: { scope: 'all_devices' },
    ip: req.ip,
  });
  return ApiResponse.send(
    res,
    ApiResponse.ok({ status: 'active', tokens: { accessToken: tokens.accessToken } }, 'Signed out of all other devices'),
  );
});

/** GET /api/settings/export — JSON download of the caller's own data. */
export const exportData = asyncHandler(async (req, res) => {
  const data = await SettingsService.exportData(req.user);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="wanderlust-data-${Date.now()}.json"`);
  return res.status(200).send(JSON.stringify(data, null, 2));
});

/** POST /api/settings/delete-account — soft delete + anonymisation. */
export const deleteAccount = asyncHandler(async (req, res) => {
  await SettingsService.requestDeletion(req.user, { password: req.body.password, reason: req.body.reason || '' });
  await auditLog.record({
    userId: req.user._id,
    email: req.user.email,
    action: 'account_deleted',
    resource: 'user',
    resourceId: req.user._id,
    metadata: { role: req.user.role },
    ip: req.ip,
  });
  res.clearCookie(config.refreshCookieName, CLEAR_COOKIE_OPTS);
  res.clearCookie(config.accessCookieName, CLEAR_COOKIE_OPTS);
  return ApiResponse.send(
    res,
    ApiResponse.ok({ deleted: true }, 'Your account has been deleted. Existing bookings remain on record for accounting.'),
  );
});

/** POST /api/settings/deactivate-owner — owner temporarily hides all listings. */
export const deactivateOwner = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.OWNER) throw ApiError.forbidden('Only owner accounts can be deactivated', 'ROLE_FORBIDDEN');
  const result = await SettingsService.deactivateOwner(req.user);
  return ApiResponse.send(res, ApiResponse.ok(result, 'Your properties were deactivated and hidden from search'));
});

/** GET /api/settings/platform — admin-only platform configuration. */
export const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = await platformSettings.get();
  return ApiResponse.send(res, ApiResponse.ok({ platform: settings }, 'Platform settings'));
});

/** PATCH /api/settings/platform — admin-only platform configuration update. */
export const updatePlatformSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN) throw ApiError.forbidden('Only administrators can change platform settings', 'ROLE_FORBIDDEN');

  const current = await platformSettings.get();
  const nextBooking = { ...current.booking, ...(req.body.booking || {}) };
  if (Number(nextBooking.minNights) > Number(nextBooking.maxNights)) {
    throw ApiError.badRequest('Minimum nights cannot exceed maximum nights', 'INVALID_RANGE');
  }
  if (Number(nextBooking.advanceBookingDays) < Number(nextBooking.maxNights)) {
    throw ApiError.badRequest('Advance booking window must be at least the maximum stay', 'INVALID_RANGE');
  }

  const platform = await platformSettings.update(req.body);
  await auditLog.record({
    userId: req.user._id,
    email: req.user.email,
    action: 'settings_updated',
    resource: 'platform_settings',
    resourceId: 'platform',
    metadata: { sections: Object.keys(req.body || {}) },
    ip: req.ip,
  });
  return ApiResponse.send(res, ApiResponse.ok({ platform }, 'Platform settings saved'));
});
