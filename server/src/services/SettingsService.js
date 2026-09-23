import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import { Hotel } from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import { ROLES, SERVICE_FEE_RATE } from '../utils/constants.js';
import AuthService from './AuthService.js';
import platformSettings from './PlatformSettingsService.js';

/** Fields a user may change on their own profile. */
const PROFILE_FIELDS = ['name', 'phone', 'avatar', 'dateOfBirth', 'gender'];
const ADDRESS_FIELDS = ['line1', 'city', 'state', 'country', 'postalCode'];
/** Simple scalar preferences any role can edit. */
const SCALAR_PREFERENCES = ['currency', 'language', 'theme'];
/** Nested preference sections, keyed by the role allowed to edit them (null = any). */
const SECTION_ACCESS = {
  emailNotifications: null,
  inAppNotifications: null,
  privacy: null,
  bookingPreferences: ROLES.CUSTOMER,
  travelPreferences: ROLES.CUSTOMER,
  business: ROLES.OWNER,
};

/** Notification flags that must never be disabled (account-safety critical). */
const ALWAYS_ON_EMAIL = ['securityAlerts'];

class SettingsService {
  /** Cleans + coerces an incoming patch into dotted `$set` paths. */
  buildUpdate(user, patch = {}) {
    const set = {};

    for (const field of PROFILE_FIELDS) {
      if (patch[field] === undefined) continue;
      // Date fields must be cleared with null — '' fails Mongoose's Date cast.
      set[field] = field === 'dateOfBirth' ? patch[field] || null : patch[field];
    }
    if (patch.address && typeof patch.address === 'object') {
      for (const field of ADDRESS_FIELDS) {
        if (patch.address[field] !== undefined) set[`address.${field}`] = patch.address[field];
      }
    }

    for (const field of SCALAR_PREFERENCES) {
      if (patch[field] !== undefined) set[`preferences.${field}`] = patch[field];
    }

    for (const [section, requiredRole] of Object.entries(SECTION_ACCESS)) {
      const incoming = patch[section];
      if (!incoming || typeof incoming !== 'object') continue;
      if (requiredRole && user.role !== requiredRole) {
        throw ApiError.forbidden(`Only ${requiredRole} accounts can change ${section}`, 'ROLE_FORBIDDEN');
      }
      for (const [field, value] of Object.entries(incoming)) {
        if (value === undefined) continue;
        // Never let a client switch off security-critical mail.
        const safeValue = section === 'emailNotifications' && ALWAYS_ON_EMAIL.includes(field) ? true : value;
        set[`preferences.${section}.${field}`] = safeValue;
      }
    }

    // Keep the legacy flat flag in sync so older call sites stay correct.
    if (patch.privacy?.marketing !== undefined) {
      set['preferences.marketingEmails'] = Boolean(patch.privacy.marketing);
    }

    return set;
  }

  async update(userId, patch) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    const set = this.buildUpdate(user, patch);
    if (Object.keys(set).length === 0) return user;

    return User.findByIdAndUpdate(userId, { $set: set }, { new: true, runValidators: true });
  }

  /** Everything the Settings page needs, shaped for the caller's role. */
  async getForUser(user) {
    const platform = await platformSettings.get();
    const payload = {
      user: user.toSafeJSON(),
      role: user.role,
      defaults: {
        language: platform.general.defaultLanguage,
        currency: platform.general.defaultCurrency,
        timezone: platform.general.timezone,
      },
    };
    if (user.role === ROLES.OWNER) {
      payload.owner = await this.ownerContext(user._id, platform);
    }
    if (user.role === ROLES.ADMIN) {
      payload.platform = platform;
    }
    return payload;
  }

  /** Read-only owner context: property summary + payout maths (no credentials). */
  async ownerContext(ownerId, platform = null) {
    const settings = platform || (await platformSettings.get());
    const hotels = await Hotel.find({ ownerId }).select('name status city slug').lean();
    return {
      properties: hotels.map((h) => ({ id: h._id, name: h.name, city: h.city, status: h.status, slug: h.slug })),
      summary: {
        total: hotels.length,
        approved: hotels.filter((h) => h.status === 'approved').length,
        pending: hotels.filter((h) => h.status === 'pending').length,
        rejected: hotels.filter((h) => h.status === 'rejected').length,
        suspended: hotels.filter((h) => h.status === 'suspended').length,
      },
      payouts: {
        commissionPercent: settings.payments.platformCommissionPercent,
        serviceFeePercent: Math.round(SERVICE_FEE_RATE * 100),
        refundsEnabled: settings.payments.refundsEnabled,
        provider: settings.payments.provider,
      },
    };
  }

  /** Login-security panel data. Only non-sensitive metadata is exposed. */
  securityInfo(user) {
    return {
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
      lastLoginDevice: user.lastLoginUserAgent || '',
      emailVerified: Boolean(user.isVerified),
      accountStatus: user.deletedAt ? 'deletion_pending' : user.isBlocked ? 'blocked' : 'active',
      deletionRequestedAt: user.deletionRequestedAt || null,
      twoFactorAvailable: false, // not supported by the current auth stack
    };
  }

  /** "Log out of all other devices" - the current device gets a fresh token pair. */
  async logoutAllDevices(userId) {
    return AuthService.logoutAllDevices(userId);
  }

  /** Self-service export of everything tied to the account (no secrets). */
  async exportData(user) {
    const [bookings, payments, reviews, wishlist] = await Promise.all([
      Booking.find({ userId: user._id }).lean(),
      Payment.find({ userId: user._id }).lean(),
      Review.find({ userId: user._id }).lean(),
      Wishlist.find({ userId: user._id }).lean(),
    ]);
    const platform = await platformSettings.get();
    return {
      exportedAt: new Date().toISOString(),
      application: platform.general.appName,
      profile: user.toSafeJSON(),
      bookings,
      payments,
      reviews,
      wishlist,
      note: 'Passwords, reset tokens and verification codes are never included in exports.',
    };
  }

  /**
   * Soft-deletes (anonymises) an account: the record stays for booking history
   * and financial integrity, but is blocked, scrubbed and locked out.
   */
  async requestDeletion(user, { password, reason = '' }) {
    if (user.role === ROLES.ADMIN) {
      const admins = await User.countDocuments({ role: ROLES.ADMIN, deletedAt: null });
      if (admins <= 1) {
        throw ApiError.badRequest(
          'The last administrator account cannot be deleted. Promote another admin first.',
          'LAST_ADMIN',
        );
      }
    }
    const withHash = await User.findById(user._id).select('+passwordHash +tokenVersion');
    if (!withHash) throw ApiError.notFound('User not found');
    const ok = await withHash.comparePassword(password);
    if (!ok) throw ApiError.badRequest('Password is incorrect', 'WRONG_PASSWORD');

    const stamp = Date.now();
    withHash.set({
      name: 'Deleted account',
      email: `deleted+${String(user._id).slice(-8)}@wanderlust.invalid`,
      phone: '',
      avatar: '',
      address: { line1: '', city: '', state: '', country: '', postalCode: '' },
      dateOfBirth: undefined,
      gender: '',
      isBlocked: true,
      deletedAt: new Date(stamp),
      deletionRequestedAt: new Date(stamp),
      deletionReason: reason,
      tokenVersion: Number(withHash.tokenVersion || 0) + 1,
      passwordHash: await bcrypt.hash(`revoked-${stamp}-${Math.random().toString(36).slice(2)}`, 12),
    });
    // An owner's listings are hidden along with the account.
    if (user.role === ROLES.OWNER) {
      await Hotel.updateMany({ ownerId: user._id }, { $set: { status: 'suspended' } });
    }
    await withHash.save({ timestamps: false });
    return { deleted: true };
  }

  /** Owner "deactivate account": hides properties but keeps the login working. */
  async deactivateOwner(user) {
    if (user.role !== ROLES.OWNER) {
      throw ApiError.forbidden('Only owner accounts can be deactivated', 'ROLE_FORBIDDEN');
    }
    const result = await Hotel.updateMany({ ownerId: user._id }, { $set: { status: 'suspended' } });
    return { suspendedProperties: result.modifiedCount ?? 0 };
  }
}

export default new SettingsService();
