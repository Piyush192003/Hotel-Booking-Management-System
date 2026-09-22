import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import NotificationService from '../services/NotificationService.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const result = await NotificationService.listForUser(req.user._id, { page, limit: 20, unreadOnly: req.query.unread === 'true', role: req.user.role });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Notifications', { total: result.total, unread: result.unread, page }));
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await NotificationService.markRead(req.user._id, req.params.id, true);
  return ApiResponse.send(res, ApiResponse.ok({ notification }, 'Marked as read'));
});

export const markAllRead = asyncHandler(async (req, res) => {
  await NotificationService.markAllRead(req.user._id, { role: req.user.role });
  return ApiResponse.send(res, ApiResponse.ok({ ok: true }, 'All notifications marked as read'));
});

export const unreadCount = asyncHandler(async (req, res) => {
  const unread = await NotificationService.unreadCount(req.user._id, { role: req.user.role });
  return ApiResponse.send(res, ApiResponse.ok({ unread }, 'Unread count'));
});