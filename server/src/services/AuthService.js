import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { tokenService } from './TokenService.js';
import EmailService from './EmailService.js';
import { hashToken, generateOtp } from '../utils/generate.js';
import { config } from '../config/env.js';
import emailTemplates from '../templates/emails.js';
import { ROLES } from '../utils/constants.js';

class AuthService {
  async register({ name, email, password, role = ROLES.CUSTOMER, phone = '', avatar = '' }) {
    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('An account with this email already exists', 'EMAIL_IN_USE');

    const passwordHash = await bcrypt.hash(password, 12);

    // Email verification is disabled for now: every new account starts verified
    // and can log in immediately. The /auth/verify-email endpoints are kept for
    // backward compatibility but are no longer part of the signup flow.
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      phone,
      avatar,
      isVerified: true,
    });

    return { user };
  }

  /**
   * Re-issue the verification code (e.g. it expired or the email got lost).
   * Never reveals whether an account exists; safe to call repeatedly
   * (rate-limited at the route level).
   */
  async resendVerification(email) {
    const user = await User.findOne({ email });
    if (!user) return { ok: true, sent: false };
    if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Contact support.');
    if (user.isVerified) return { ok: true, sent: false, alreadyVerified: true };

    const verificationToken = generateOtp(6);
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ timestamps: false });

    const verifyUrl = `${config.frontendUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    const emailResult = await EmailService.send({
      to: user.email,
      subject: 'Your new Wanderlust verification code',
      html: emailTemplates.emailVerification({ name: user.name, verifyUrl, code: verificationToken }),
    });

    const devExtras = config.isProduction
      ? {}
      : {
          devVerificationCode: verificationToken,
          ...(emailResult?.previewUrl ? { devEmailPreviewUrl: emailResult.previewUrl } : {}),
        };
    return { ok: true, sent: true, ...devExtras };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw ApiError.unauthorized('Incorrect email or password');
    if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Contact support.');
    const ok = await user.comparePassword(password);
    if (!ok) throw ApiError.unauthorized('Incorrect email or password');
    // Email verification is disabled for now — unverified accounts may log in.

    user.lastLoginAt = new Date();
    await user.save({ timestamps: false });
    return { user, tokens: this.issueTokens(user) };
  }

  issueTokens(user) {
    return {
      accessToken: tokenService.generateAccessToken(user),
      refreshToken: tokenService.generateRefreshToken(user),
    };
  }

async refresh(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
    const payload = await tokenService.verifyRefreshToken(refreshToken).catch(() => {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    });
    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked');
    await tokenService.revoke('refresh', payload.jti);
    return { user, tokens: this.issueTokens(user) };
  }

  async logout(refreshToken, accessJti) {
    if (refreshToken) {
      try {
        const payload = await tokenService.verifyRefreshToken(refreshToken);
        await tokenService.revoke('refresh', payload.jti);
      } catch {
        /* ignore */
      }
    }
    if (accessJti) await tokenService.revoke('access', accessJti);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) return { ok: true }; // Never leak account existence
    const resetToken = generateOtp(8);
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ timestamps: false });

    const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await EmailService.send({
      to: user.email,
      subject: 'Reset your Wanderlust password',
      html: emailTemplates.passwordReset({ name: user.name, resetUrl }),
    });
    return { ok: true };
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ timestamps: false });
  }

  async verifyEmail(token, email) {
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) throw ApiError.notFound('No account with this email');
    if (user.isVerified) return { user };
    const expected = hashToken(token);
    if (
      !user.emailVerificationToken ||
      user.emailVerificationToken !== expected ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw ApiError.badRequest('Invalid or expired verification code', 'INVALID_VERIFICATION_TOKEN');
    }
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ timestamps: false });
    return { user };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw ApiError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save({ timestamps: false });
  }

  async updateProfile(userId, updates) {
    const allowed = ['name', 'phone', 'avatar', 'address', 'preferences'];
    const patch = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) patch[key] = updates[key];
    }
    const user = await User.findByIdAndUpdate(userId, patch, { new: true, runValidators: true });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }
}
export default new AuthService();