import PlatformSetting, { DEFAULT_PLATFORM_SETTINGS } from '../models/PlatformSetting.js';

/**
 * Reads the single platform-settings document with a short in-memory cache so
 * hot paths (booking, pricing, reviews, hotel submission) don't hit the DB on
 * every request. Always degrades to defaults if the document is missing or the
 * database is unavailable — a settings read must never break a request.
 */
const CACHE_TTL_MS = 60 * 1000;

let cache = null;
let cachedAt = 0;

class PlatformSettingsService {
  /** Plain settings object (never throws). */
  async get({ force = false } = {}) {
    const fresh = force || !cache || Date.now() - cachedAt > CACHE_TTL_MS;
    if (!fresh) return cache;
    try {
      const doc = await PlatformSetting.findOne({ key: 'platform' }).lean();
      cache = doc ? this.merge(doc) : { ...DEFAULT_PLATFORM_SETTINGS };
    } catch {
      cache = { ...DEFAULT_PLATFORM_SETTINGS };
    }
    cachedAt = Date.now();
    return cache;
  }

  /** Flattens a stored document over the defaults so new fields always exist. */
  merge(doc) {
    const out = {};
    for (const [section, values] of Object.entries(DEFAULT_PLATFORM_SETTINGS)) {
      out[section] = { ...values, ...(doc?.[section] || {}) };
    }
    return out;
  }

  /** Creates the document on first boot / seed if it does not exist yet. */
  async ensure() {
    const existing = await PlatformSetting.findOne({ key: 'platform' });
    if (existing) return existing;
    return PlatformSetting.create({ key: 'platform', ...DEFAULT_PLATFORM_SETTINGS });
  }

  /** Admin update — partial merge per section, then invalidate the cache. */
  async update(patch) {
    const doc = (await this.ensure()).toObject();
    const next = this.merge(doc);
    for (const section of Object.keys(DEFAULT_PLATFORM_SETTINGS)) {
      if (patch?.[section] === undefined) continue;
      for (const [field, value] of Object.entries(patch[section])) {
        if (!(field in DEFAULT_PLATFORM_SETTINGS[section])) continue;
        if (value === undefined) continue;
        next[section][field] = value;
      }
    }
    if (next.booking.minNights > next.booking.maxNights) {
      next.booking.maxNights = next.booking.minNights;
    }
    const updated = await PlatformSetting.findOneAndUpdate(
      { key: 'platform' },
      { $set: next },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    cache = this.merge(updated);
    cachedAt = Date.now();
    return cache;
  }

  /** Test/seed helper. */
  clearCache() {
    cache = null;
    cachedAt = 0;
  }
}

const platformSettingsService = new PlatformSettingsService();
export { PlatformSettingsService, DEFAULT_PLATFORM_SETTINGS };
export default platformSettingsService;
