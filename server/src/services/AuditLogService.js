import AuditLog from '../models/AuditLog.js';

class AuditLogService {
  /**
   * Records an administrative/security action.
   * @param {object} opts - { userId, email, action, resource, resourceId, metadata, ip }
   */
  async record({ userId, email = '', action, resource, resourceId, metadata = {}, ip = '' }) {
    try {
      await AuditLog.create({
        actor: userId ? { type: 'user', userId, email } : { type: 'system' },
        action,
        resource,
        resourceId,
        metadata,
        ip,
      });
    } catch (err) {
      // Audit failures must never break the primary operation.
      console.error('[audit] failed to record', action, err.message);
    }
  }

  async list({ page = 1, limit = 20, action, resource, search }) {
    const query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (search) query['actor.email'] = new RegExp(search, 'i');

    const [docs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);
    return { docs, total, page, limit };
  }
}

export default new AuditLogService();