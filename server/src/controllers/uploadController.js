import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import UploadService from '../services/UploadService.js';
import ApiError from '../utils/ApiError.js';

/**
 * Handles multipart image uploads (hotel/room images, avatars).
 * Files are validated by the multer middleware, uploaded to Cloudinary when
 * configured, otherwise stored in the local ./uploads dev folder.
 */
export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No files were uploaded', 'UPLOAD_ERROR');
  }
  const uploaded = await UploadService.uploadMany(req.files, 'wanderlust/images');
  return ApiResponse.send(res, ApiResponse.created({ urls: uploaded.map((u) => u.url), uploads: uploaded }, `Uploaded ${uploaded.length} image(s)`));
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded', 'UPLOAD_ERROR');
  const uploaded = await UploadService.upload(req.file.path, { folder: 'wanderlust/avatars' });
  return ApiResponse.send(res, ApiResponse.created({ url: uploaded.url }, 'Avatar uploaded'));
});