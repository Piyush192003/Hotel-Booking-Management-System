import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import AuthService from '../services/AuthService.js';
import { config } from '../config/env.js';

const cookieSameSite = config.isProduction ? 'none' : 'lax';

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: cookieSameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const ACCESS_COOKIE = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: cookieSameSite,
  path: '/',
};

function setAuthCookies(res, tokens) {
  res.cookie(config.refreshCookieName, tokens.refreshToken, REFRESH_COOKIE);
  res.cookie(config.accessCookieName, tokens.accessToken, { ...ACCESS_COOKIE, maxAge: 15 * 60 * 1000 });
}

function clearAuthCookies(res) {
  res.clearCookie(config.refreshCookieName, { path: '/' });
  res.clearCookie(config.accessCookieName, { path: '/' });
}

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || undefined,
    phone: req.body.phone || '',
  });
  // Deliberately no auth cookies: the user logs in explicitly after signup.
  return ApiResponse.send(
    res,
    ApiResponse.created(
      { user: result.user.toSafeJSON() },
      'Account created successfully. Log in to continue.',
    ),
  );
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await AuthService.resendVerification(req.body.email);
  if (result.alreadyVerified) {
    return ApiResponse.send(res, ApiResponse.ok({ alreadyVerified: true }, 'Email is already verified. You can log in.'));
  }
  if (!result.sent) {
    // Account unknown or already verified — generic on purpose (no enumeration).
    return ApiResponse.send(res, ApiResponse.ok({ sent: true }, 'If that email needs verification, a new code has been sent.'));
  }
  return ApiResponse.send(
    res,
    ApiResponse.ok(
      {
        sent: true,
        devVerificationCode: result.devVerificationCode,
        devEmailPreviewUrl: result.devEmailPreviewUrl,
      },
      'A new verification code has been sent.',
    ),
  );
});

export const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await AuthService.login({
    email: req.body.email,
    password: req.body.password,
    userAgent: req.headers['user-agent'] || '',
  });
  setAuthCookies(res, tokens);
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON(), tokens: { accessToken: tokens.accessToken } }, 'Logged in successfully'));
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[config.refreshCookieName] || req.body.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  const { user, tokens } = await AuthService.refresh(refreshToken);
  setAuthCookies(res, tokens);
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON(), tokens: { accessToken: tokens.accessToken } }, 'Tokens refreshed'));
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[config.refreshCookieName];
  await AuthService.logout(refreshToken, req.tokenPayload?.jti);
  clearAuthCookies(res);
  return ApiResponse.send(res, ApiResponse.ok(null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.send(res, ApiResponse.ok({ user: req.user.toSafeJSON() }, 'Current user'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await AuthService.forgotPassword(req.body.email);
  return ApiResponse.send(res, ApiResponse.ok({ ok: true }, 'If that email exists, a reset link has been sent.'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await AuthService.resetPassword(req.body.token, req.body.password);
  return ApiResponse.send(res, ApiResponse.ok({ ok: true }, 'Password has been reset. You can now log in.'));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { user } = await AuthService.verifyEmail(req.body.token, req.body.email);
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON() }, 'Email verified successfully'));
});

export const changePassword = asyncHandler(async (req, res) => {
  await AuthService.changePassword(req.user._id, req.body.currentPassword, req.body.password);
  return ApiResponse.send(res, ApiResponse.ok({ ok: true }, 'Password changed successfully'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await AuthService.updateProfile(req.user._id, req.body);
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON() }, 'Profile updated'));
});