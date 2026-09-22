import Wishlist from '../models/Wishlist.js';
import { Hotel } from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import { HOTEL_STATUS } from '../utils/constants.js';

class WishlistService {
  async add(userId, hotelId) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel || hotel.status !== HOTEL_STATUS.APPROVED) {
      throw ApiError.notFound('Hotel not found');
    }
    const existing = await Wishlist.findOne({ userId, hotelId });
    if (existing) return { added: false, item: existing };
    const item = await Wishlist.create({ userId, hotelId });
    return { added: true, item };
  }

  async remove(userId, hotelId) {
    const res = await Wishlist.findOneAndDelete({ userId, hotelId });
    return { removed: Boolean(res) };
  }

  async list(userId, { page = 1, limit = 12 }) {
    const [docs, total] = await Promise.all([
      Wishlist.find({ userId })
        .populate({
          path: 'hotelId',
          match: { status: HOTEL_STATUS.APPROVED },
          select: 'name city images rating reviewCount amenities propertyType location',
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Wishlist.countDocuments({ userId }),
    ]);
    const items = docs.filter((d) => d.hotelId);
    return { docs: items, total, page, limit };
  }

  async isWishlisted(userId, hotelId) {
    if (!userId) return false;
    return Boolean(await Wishlist.exists({ userId, hotelId }));
  }

  async toggle(userId, hotelId) {
    const existing = await Wishlist.findOne({ userId, hotelId });
    if (existing) {
      await existing.deleteOne();
      return { wishlisted: false };
    }
    await this.add(userId, hotelId);
    return { wishlisted: true };
  }
}

export default new WishlistService();