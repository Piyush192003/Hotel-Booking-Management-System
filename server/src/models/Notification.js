import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // Which dashboard role(s) this alert belongs to — guest journey ("customer")
    // vs property business ("owner") vs platform ("admin"). Readers only see
    // alerts tagged for their own role, so "How was your stay?" never lands
    // in an owner's inbox even if they also booked as a guest.
    audience: { type: [String], default: undefined, index: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, default: '', maxlength: 800 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;