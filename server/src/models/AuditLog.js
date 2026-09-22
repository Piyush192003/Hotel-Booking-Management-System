import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../utils/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: { type: String, enum: ['user', 'system'], default: 'user' },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, default: '' },
    },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    resource: { type: String, required: true, default: 'system' },
    resourceId: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
  },
  { timestamps: true },
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ 'actor.userId': 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;