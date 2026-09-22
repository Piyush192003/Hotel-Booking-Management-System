import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';

// Which dashboard role(s) each notification type belongs to.
// Customer = guest journey (bookings, payments, reminders, reviews to write).
// Owner = property business (new bookings, guest reviews, property status).
// Admin = moderation/system alerts. Unlisted types fall back to everyone, so a
// new type is never silently hidden from all feeds.
export const NOTIFICATION_AUDIENCE_BY_TYPE = {
  payment_successful: ['customer'],
  booking_cancelled: ['customer'],
  refund_processed: ['customer'],
  check_in_reminder: ['customer'],
  review_request: ['customer'],
  booking_completed: ['customer'],
  guest_review: ['owner'],
  property_approved: ['owner'],
  property_rejected: ['owner'],
  property_suspended: ['owner'],
  system: ['customer', 'owner', 'admin'],
};

// Module-level helpers so any code can obtain the in-app audience for a given
// role without importing the singleton (call graph is mixed):
//   NotificationService.forGuest()          (static / instance forward)
//   { audience: audienceForGuest() }        (named import)
export const audienceForGuest = () => ['customer'];
export const audienceForOwner = () => ['owner'];

export function isDemoAccount(token) {
  if (!token?.sub) return false;
  return (
    token.userId === process.env.DEMO_GUEST_USER_ID ||
    token.userId === process.env.DEMO_OWNER_USER_ID
  );
}

class NotificationService {
  /** Creates in-app notifications for one or many users. */
  async createMany({ userIds, type, title, message = '', data = {}, link = '', audience }) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return [];
    const docs = ids
      .filter(Boolean)
      .map((userId) => ({
        userId,
        type,
        title,
        message,
        data,
        link,
        audience: audience ?? NOTIFICATION_AUDIENCE_BY_TYPE[type] ?? ['customer', 'owner', 'admin'],
      }));
    return Notification.insertMany(docs, { ordered: false }).catch((err) => {
      // Ignore duplicates; deliver what we can.
      if (err?.code === 11000) return Promise.resolve([]);
      throw err;
    });
  }

  async listForUser(userId, { page = 1, limit = 20, unreadOnly = false, role = null }) {
    const query = { userId };
    if (unreadOnly) query.isRead = false;
    // Role-appropriate feed so a host account doesn't see guest-journey alerts.
    if (role && role !== 'admin') {
      query.$or = [
        { audience: role },
        { audience: { $exists: false } },
        { audience: { $size: 0 } },
      ];
    }
    const [docs, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false, ...(query.$or ? { $or: query.$or } : {}) }),
    ]);
    return { docs, total, unread, page, limit };
  }

  /** Audience tag used by guest-side call sites ("Booking confirmed 🎉"). */
  static forGuest() { return ['customer']; }

  /** Audience tag used by owner-side call sites ("New booking confirmed"). */
  static forOwner() { return ['owner']; }

  async markRead(userId, notificationId, read = true) {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) throw ApiError.notFound('Notification not found');
    notification.isRead = read;
    notification.readAt = read ? new Date() : null;
    await notification.save();
    return notification;
  }

  async markAllRead(userId, { role = null } = {}) {
    const query = { userId, isRead: false };
    if (role && role !== 'admin') {
      query.$or = [
        { audience: role },
        { audience: { $exists: false } },
        { audience: { $size: 0 } },
      ];
    }
    await Notification.updateMany(query, { $set: { isRead: true, readAt: new Date() } });
  }

  async unreadCount(userId, { role = null } = {}) {
    const query = { userId, isRead: false };
    if (role && role !== 'admin') {
      query.$or = [
        { audience: role },
        { audience: { $exists: false } },
        { audience: { $size: 0 } },
      ];
    }
    return Notification.countDocuments(query);
  }
}

// Export a singleton instance with instance-level forwards for forGuest/forOwner
// so call sites that use the default export as an instance resolve too.
const singleton = new NotificationService();
Object.assign(singleton, {
  forGuest: NotificationService.forGuest,
  forOwner: NotificationService.forOwner,
});

export default singleton;