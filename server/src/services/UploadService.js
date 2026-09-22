import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import path from 'node:path';
import { config, isCloudinaryConfigured } from '../config/env.js';
import { ensureUploadDir } from '../utils/envHelpers.js';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

/**
 * Image upload abstraction. Uses Cloudinary when credentials are present;
 * otherwise stores files in ./uploads (served statically) — a clearly
 * labelled development fallback. Never stores file blobs in MongoDB.
 */
class UploadService {
  get isCloudinary() {
    return isCloudinaryConfigured;
  }

  async upload(pathOrBuffer, { folder = 'wanderlust', publicId } = {}) {
    if (this.isCloudinary) {
      const result = await cloudinary.uploader.upload(pathOrBuffer, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: { quality: 'auto:good', fetch_format: 'auto' },
      });
      return { url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' };
    }
    // Local development fallback
    const filename = publicId ? `${publicId}${path.extname(pathOrBuffer) || '.jpg'}` : path.basename(pathOrBuffer);
    const target = path.join(ensureUploadDir(), filename);
    fs.copyFileSync(pathOrBuffer, target);
    const url = `${config.serverUrl}/uploads/${filename}`;
    return { url, publicId: filename, provider: 'local' };
  }

  async uploadMany(files, folder = 'wanderlust') {
    const results = [];
    for (const file of files || []) {
      const item = await this.upload(file.path, { folder });
      results.push(item);
      fs.unlink(file.path, () => {}); // cleanup temp
    }
    return results;
  }

  async destroy(publicId) {
    if (!publicId) return;
    if (this.isCloudinary) {
      await cloudinary.uploader.destroy(publicId).catch(() => {});
      return;
    }
    const target = path.join(ensureUploadDir(), path.basename(publicId));
    fs.unlink(target, () => {});
  }

  /** Given either {url, publicId} results or raw file paths, returns URLs. */
  toUrls(items) {
    return (items || []).map((item) => (typeof item === 'string' ? item : item.url));
  }
}

export default new UploadService();