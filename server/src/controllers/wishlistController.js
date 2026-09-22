import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import WishlistService from '../services/WishlistService.js';

export const getWishlist = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const result = await WishlistService.list(req.user._id, { page, limit: 12 });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Wishlist', { total: result.total, page }));
});

export const addToWishlist = asyncHandler(async (req, res) => {
  await WishlistService.add(req.user._id, req.params.hotelId);
  return ApiResponse.send(res, ApiResponse.ok({ wishlisted: true, hotelId: req.params.hotelId }, 'Added to wishlist'));
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await WishlistService.remove(req.user._id, req.params.hotelId);
  return ApiResponse.send(res, ApiResponse.ok({ wishlisted: false, hotelId: req.params.hotelId }, 'Removed from wishlist'));
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const result = await WishlistService.toggle(req.user._id, req.params.hotelId);
  return ApiResponse.send(res, ApiResponse.ok(result, 'Wishlist updated'));
});

export const wishlistStatus = asyncHandler(async (req, res) => {
  const wishlisted = await WishlistService.isWishlisted(req.user?._id, req.params.hotelId);
  return ApiResponse.send(res, ApiResponse.ok({ wishlisted }, 'Wishlist status'));
});