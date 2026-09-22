import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import ApiError from '../utils/ApiError.js';
import { ensureUploadDir } from '../utils/envHelpers.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES = 10;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, ensureUploadDir());
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported file type "${file.mimetype}"`, 'UPLOAD_ERROR'));
  }
  return cb(null, true);
};

export const uploadImage = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES } });

export const uploadImagesFields = uploadImage.array('images', MAX_FILES);
export const uploadAvatar = uploadImage.single('avatar');

/** Deletes local files for a request when an upload partially fails later. */
export function cleanupUploadedFiles(files) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    fs.unlink(file.path, () => {});
  }
}

export { ALLOWED_IMAGE_TYPES };