import mongoose from 'mongoose';
import { Hotel, Room } from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import { generateSlug } from '../utils/generate.js';
import { PUBLIC_HOTEL_STATUSES, HOTEL_STATUS, ROOM_STATUS, SORT_OPTIONS, PAGINATION } from '../utils/constants.js';
import { toLocalMidnight } from '../utils/dateUtils.js';
import { findCityCoords } from '../utils/cities.js';
import { ROLES } from '../utils/constants.js';

const HotelDocs = Hotel;

class HotelService {
  async createHotel(ownerId, data) {
    const payload = {
      ownerId,
      name: data.name,
      slug: generateSlug(data.name),
      tagline: data.tagline || '',
      description: data.description,
      propertyType: data.propertyType || 'hotel',
      starRating: data.starRating || 3,
      address: data.address,
      city: data.city,
      state: data.state || '',
      country: data.country || 'India',
      postalCode: data.postalCode || '',
      images: data.images || [],
      amenities: data.amenities || [],
      policies: {
        checkInTime: data.policies?.checkInTime || '14:00',
        checkOutTime: data.policies?.checkOutTime || '11:00',
        cancellation: {
          freeCancellationHours: data.policies?.cancellation?.freeCancellationHours ?? 48,
          cancellationFeePercent: data.policies?.cancellation?.cancellationFeePercent ?? 25,
        },
        houseRules: data.policies?.houseRules || [],
        petPolicy: data.policies?.petPolicy || 'No pets allowed',
      },
      location: {
        type: 'Point',
        coordinates: [
          Number(data.location?.longitude) || 0,
          Number(data.location?.latitude) || 0,
        ],
      },
      status: HOTEL_STATUS.PENDING,
      submittedAt: new Date(),
    };
    return Hotel.create(payload);
  }

  async updateHotel(hotelId, data, { asAdmin = false } = {}) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    const allowed = [
      'name', 'tagline', 'description', 'propertyType', 'starRating', 'address', 'city', 'state',
      'country', 'postalCode', 'images', 'amenities', 'featured',
    ];
    const patch = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.location?.latitude !== undefined && data.location?.longitude !== undefined) {
      patch.location = {
        type: 'Point',
        coordinates: [Number(data.location.longitude) || 0, Number(data.location.latitude) || 0],
      };
    }
    if (data.policies) {
      patch.policies = {
        checkInTime: data.policies.checkInTime || hotel.policies?.checkInTime || '14:00',
        checkOutTime: data.policies.checkOutTime || hotel.policies?.checkOutTime || '11:00',
        cancellation: {
          freeCancellationHours:
            data.policies.cancellation?.freeCancellationHours ?? hotel.policies?.cancellation?.freeCancellationHours ?? 48,
          cancellationFeePercent:
            data.policies.cancellation?.cancellationFeePercent ?? hotel.policies?.cancellation?.cancellationFeePercent ?? 25,
        },
        houseRules: data.policies.houseRules || hotel.policies?.houseRules || [],
        petPolicy: data.policies.petPolicy || hotel.policies?.petPolicy || 'No pets allowed',
      };
    }
    if (patch.name && patch.name !== hotel.name) patch.slug = generateSlug(patch.name);
    // Owner edits push the property back to pending review unless admin.
    if (!asAdmin && hotel.status === HOTEL_STATUS.APPROVED) {
      patch.status = HOTEL_STATUS.PENDING;
      patch.submittedAt = new Date();
    }
    Object.assign(hotel, patch);
    await hotel.save();
    return hotel;
  }

  async deleteHotel(hotelId) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    await Room.deleteMany({ hotelId: hotel._id });
    await hotel.deleteOne();
    return hotel;
  }

  async getHotelById(id, { publicOnly = true } = {}) {
    const hotel = await Hotel.findById(id);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    if (publicOnly && !PUBLIC_HOTEL_STATUSES.includes(hotel.status)) {
      throw ApiError.notFound('Hotel not found');
    }
    return hotel;
  }

  async getPublicHotelBySlug(slug) {
    const hotel = await Hotel.findOne({ slug, status: { $in: PUBLIC_HOTEL_STATUSES } });
    if (!hotel) throw ApiError.notFound('Hotel not found');
    return hotel;
  }

  async listByOwner(ownerId, { status } = {}) {
    const query = { ownerId };
    if (status) query.status = status;
    const hotels = await Hotel.find(query).sort({ createdAt: -1 }).lean();
    if (!hotels.length) return hotels;
    // Attach cheapest active room price + room count so the owner list shows real "from" prices.
    const stats = await Room.aggregate([
      { $match: { hotelId: { $in: hotels.map((h) => h._id) }, status: ROOM_STATUS.ACTIVE } },
      { $group: { _id: '$hotelId', minPrice: { $min: '$pricePerNight' }, roomCount: { $sum: 1 } } },
    ]);
    const byHotel = new Map(stats.map((s) => [String(s._id), s]));
    for (const hotel of hotels) {
      const s = byHotel.get(String(hotel._id));
      if (s) {
        hotel.minPrice = s.minPrice;
        hotel.roomCount = s.roomCount;
      }
    }
    return hotels;
  }

  async setStatus(hotelId, status, { rejectionReason = '', actorId, ip } = {}) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    hotel.status = status;
    hotel.rejectionReason = status === HOTEL_STATUS.REJECTED ? rejectionReason : '';
    if (status === HOTEL_STATUS.APPROVED) hotel.submittedAt = hotel.submittedAt || new Date();
    await hotel.save();
    return hotel;
  }

  async searchHotels(params = {}) {
    const {
      destination,
      checkIn,
      checkOut,
      guests = 0,
      rooms = 1,
      minPrice,
      maxPrice,
      rating = 0,
      amenities = [],
      propertyType,
      sort = SORT_OPTIONS.REVIEWS,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      latitude,
      longitude,
      near = false,
    } = params;

    const safeLimit = Math.min(Number(limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (Number(page) - 1) * safeLimit;

    const baseMatch = { status: HOTEL_STATUS.APPROVED };
    const cityCoords = destination ? findCityCoords(destination) : null;

    const pipeline = [];

    if (near && latitude !== undefined && longitude !== undefined) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
          distanceField: 'distanceMeters',
          spherical: true,
          query: baseMatch,
        },
      });
    } else if (cityCoords) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: cityCoords.coordinates },
          distanceField: 'distanceMeters',
          spherical: true,
          query: baseMatch,
          maxDistance: 120000, // 120 km "city" radius
        },
      });
    } else if (destination) {
      pipeline.push({ $match: { ...baseMatch, city: { $regex: new RegExp(`^${escapeRegex(destination)}`, 'i') } } });
    } else {
      pipeline.push({ $match: baseMatch });
    }

    // Attach active rooms
    pipeline.push({
      $lookup: {
        from: 'rooms',
        let: { hotelId: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$hotelId', '$$hotelId'] }, status: 'active' } }],
        as: 'rooms',
      },
    });
    pipeline.push({ $match: { 'rooms.0': { $exists: true } } });

    // Hard filters (price, capacity, amenities, type, rating)
    const roomConditions = [];
    if (Number(guests) > 0) {
      roomConditions.push({
        $or: [
          { 'rooms.capacity.adults': { $gte: Number(guests) } },
        ],
      });
    }
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      roomConditions.push({ 'rooms.pricePerNight': { $gte: Number(minPrice) } });
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      roomConditions.push({ 'rooms.pricePerNight': { $lte: Number(maxPrice) } });
    }
    roomConditions.push({ $expr: { $gt: [{ $size: '$rooms' }, 0] } });

    pipeline.push({ $match: { $and: roomConditions } });

    if (Array.isArray(amenities) && amenities.length > 0) {
      pipeline.push({ $match: { amenities: { $all: amenities } } });
    }
    if (propertyType) pipeline.push({ $match: { propertyType } });
    if (Number(rating) > 0) pipeline.push({ $match: { rating: { $gte: Number(rating) } } });

    // Date-range availability check via the per-night sales ledger
    const hasAvailability = Boolean(checkIn && checkOut);
    if (hasAvailability) {
      const ci = toLocalMidnight(checkIn);
      const co = toLocalMidnight(checkOut);
      if (ci.getTime() >= co.getTime()) throw ApiError.badRequest('Invalid date range', 'INVALID_DATES');
      const nights = [];
      for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) nights.push(new Date(d));
      const lastNight = nights[nights.length - 1];
      pipeline.push(
        { $unwind: '$rooms' },
        {
          $lookup: {
            from: 'bookingslots',
            let: { roomId: '$rooms._id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$roomId', '$$roomId'] }, date: { $gte: ci, $lte: lastNight } } },
              { $group: { _id: null, sold: { $sum: '$unitsBooked' } } },
            ],
            as: 'sold',
          },
        },
        {
          $addFields: {
            soldUnits: { $ifNull: [{ $arrayElemAt: ['$sold.sold', 0] }, 0] },
            remainingUnits: {
              $subtract: ['$rooms.totalUnits', { $ifNull: [{ $arrayElemAt: ['$sold.sold', 0] }, 0] }],
            },
          },
        },
        { $match: { $expr: { $gte: ['$remainingUnits', Math.max(Number(rooms), 1)] } } },
      );
    }
    pipeline.push({
      $group: {
        _id: '$_id',
        hotel: { $first: '$$ROOT' },
        minPrice: {
          $min: {
            $reduce: {
              input: { $cond: [{ $isArray: '$rooms.pricePerNight' }, '$rooms.pricePerNight', ['$rooms.pricePerNight']] },
              initialValue: 1e15,
              in: { $min: ['$$value', '$$this'] },
            },
          },
        },
        maxPrice: {
          $max: {
            $reduce: {
              input: { $cond: [{ $isArray: '$rooms.pricePerNight' }, '$rooms.pricePerNight', ['$rooms.pricePerNight']] },
              initialValue: 0,
              in: { $max: ['$$value', '$$this'] },
            },
          },
        },
        ...(hasAvailability ? { availableRoomTypes: { $sum: 1 } } : {}),
      },
    });

    pipeline.push({
      $set: {
        hotelId: '$_id',
        distanceMeters: '$hotel.distanceMeters',
        featured: '$hotel.featured',
        rating: '$hotel.rating',
        reviewCount: '$hotel.reviewCount',
        createdAt: '$hotel.createdAt',
      },
    });
    pipeline.push({
      $project: {
        hotel: 1, minPrice: 1, maxPrice: 1, distanceMeters: 1, hotelId: 1,
        featured: 1, rating: 1, reviewCount: 1, createdAt: 1, availableRoomTypes: 1,
      },
    });

    const sortStage = this._buildSort(sort, hasAvailability);
    if (sortStage) {
      if (sort === 'distance') pipeline.push({ $sort: { distanceMeters: 1 } });
      else pipeline.push(sortStage);
    }

    const [results, countRes] = await Promise.all([
      Hotel.aggregate([...pipeline, { $skip: skip }, { $limit: safeLimit }]),
      Hotel.aggregate([...pipeline, { $count: 'total' }]),
    ]);

    const docs = results.map((r) => ({ ...(r.hotel || {}), ...r }));
    return {
      docs,
      total: countRes[0]?.total ?? 0,
      page: Number(page),
      limit: safeLimit,
      pages: Math.ceil((countRes[0]?.total ?? 0) / safeLimit),
      destination: cityCoords ? cityCoords.city : destination || null,
    };
  }

  _buildSort(sort) {
    switch (sort) {
      case SORT_OPTIONS.PRICE_ASC:
        return { $sort: { minPrice: 1 } };
      case SORT_OPTIONS.PRICE_DESC:
        return { $sort: { minPrice: -1 } };
      case SORT_OPTIONS.RATING:
      case SORT_OPTIONS.RATING_DESC:
        return { $sort: { rating: -1, reviewCount: -1 } };
      case SORT_OPTIONS.NEWEST:
        return { $sort: { createdAt: -1 } };
      case 'distance':
        return null;
      case SORT_OPTIONS.REVIEWS:
      default:
        return { $sort: { reviewCount: -1, rating: -1 } };
    }
  }

  /** Home page collections. */
  async collections() {
    const roomLookup = (extra) => [
      { $match: { status: HOTEL_STATUS.APPROVED } },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: 'hotelId',
          pipeline: [{ $match: { status: ROOM_STATUS.ACTIVE } }],
          as: 'rooms',
        },
      },
      { $match: { 'rooms.0': { $exists: true } } },
      { $addFields: { minPrice: { $min: '$rooms.pricePerNight' } } },
      ...extra,
    ];
    const [featured, topRated, budget, luxury, popularDestinations] = await Promise.all([
      Hotel.aggregate([...roomLookup([{ $sort: { rating: -1 } }, { $limit: 6 }])]),
      Hotel.aggregate([...roomLookup([{ $sort: { rating: -1, reviewCount: -1 } }, { $limit: 6 }])]),
      Hotel.aggregate([...roomLookup([{ $sort: { minPrice: 1 } }, { $limit: 6 }])]),
      Hotel.aggregate([...roomLookup([{ $sort: { minPrice: -1 } }, { $limit: 6 }])]),
      Hotel.aggregate([
        { $match: { status: HOTEL_STATUS.APPROVED } },
        { $group: { _id: '$city', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);
    return { featured, topRated, budget, luxury, popularDestinations };
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export default new HotelService();