import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ReviewService from '../services/ReviewService.js';
import AuditLogService from '../services/AuditLogService.js';

export const createReview = asyncHandler(async (req, res) => {
  const review = await ReviewService.create({ userId: req.user._id, ...req.body });
  return ApiResponse.send(res, ApiResponse.created({ review }, 'Review submitted. Thank you!'));
});

export const myReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const result = await ReviewService.listForUser(req.user._id, { page, limit: 12 });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Reviews', { total: result.total, page }));
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await ReviewService.update(req.user._id, req.params.id, req.body);
  return ApiResponse.send(res, ApiResponse.ok({ review }, 'Review updated'));
});

export const deleteReview = asyncHandler(async (req, res) => {
  await ReviewService.delete(req.user._id, req.params.id);
  return ApiResponse.send(res, ApiResponse.ok(null, 'Review deleted'));
});

export const replyReview = asyncHandler(async (req, res) => {
  const review = await ReviewService.replyByOwner({ reviewId: req.params.id, hotelOwnerId: req.user._id, text: req.body.text });
  return ApiResponse.send(res, ApiResponse.ok({ review }, 'Reply posted'));
});

export const moderateReview = asyncHandler(async (req, res) => {
  const review = await ReviewService.moderate(req.params.id, req.body.status);
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: 'review_moderated', resource: 'review', resourceId: req.params.id, metadata: { status: req.body.status }, ip: req.ip });
  return ApiResponse.send(res, ApiResponse.ok({ review }, `Review ${req.body.status}`));
});

export const adminReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const result = await ReviewService.listForAdmin({ status: req.query.status, search: req.query.search, page, limit: 20 });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Reviews', { total: result.total, page }));
});

export const addComment = asyncHandler(async (req, res) => {
  const review = await ReviewService.addComment({ reviewId: req.params.id, userId: req.user._id, text: req.body.text });
  return ApiResponse.send(res, ApiResponse.created({ review }, 'Comment added'));
});

export const updateComment = asyncHandler(async (req, res) => {
  const review = await ReviewService.updateComment({ reviewId: req.params.id, commentId: req.params.commentId, userId: req.user._id, text: req.body.text });
  return ApiResponse.send(res, ApiResponse.ok({ review }, 'Comment updated'));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const review = await ReviewService.deleteComment({ reviewId: req.params.id, commentId: req.params.commentId, userId: req.user._id, isAdmin });
  return ApiResponse.send(res, ApiResponse.ok({ review }, 'Comment deleted'));
});