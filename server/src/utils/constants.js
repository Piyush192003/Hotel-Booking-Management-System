export const ROLES = {
  CUSTOMER: 'customer',
  OWNER: 'owner',
  ADMIN: 'admin',
};

export const ROLES_LIST = Object.values(ROLES);

export const HOTEL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const PUBLIC_HOTEL_STATUSES = [HOTEL_STATUS.APPROVED];

export const ROOM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

export const REVIEW_STATUS = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
};

export const COUPON_DISCOUNT_TYPE = {
  PERCENT: 'percent',
  FIXED: 'fixed',
};

export const NOTIFICATION_TYPES = [
  'booking_confirmed',
  'payment_successful',
  'booking_cancelled',
  'refund_processed',
  'check_in_reminder',
  'review_request',
  'guest_review',
  'property_approved',
  'property_rejected',
  'property_suspended',
  'booking_completed',
  'system',
];

export const AUDIT_ACTIONS = [
  'user_blocked',
  'user_unblocked',
  'property_approved',
  'property_rejected',
  'property_suspended',
  'property_reactivated',
  'booking_modified',
  'refund_processed',
  'review_moderated',
  'coupon_created',
  'coupon_updated',
  'coupon_deleted',
  'user_role_changed',
];

export const PAYMENT_PROVIDERS = {
  RAZORPAY: 'razorpay',
  MOCK: 'mock',
  STRIPE: 'stripe', // reserved for future providers
};

export const CURRENCY = 'INR';
export const TAX_RATE = 0.12; // 12% GST-style tax
export const SERVICE_FEE_RATE = 0.08; // 8% platform service fee

export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
  DEFAULT_PAGE: 1,
};

export const SORT_OPTIONS = {
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
  RATING_DESC: 'rating_desc',
  REVIEWS: 'reviews',
  NEWEST: 'newest',
};

export const REVIEW_MAX_PER_BOOKING = 1;