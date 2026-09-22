import { Room, Hotel } from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import AvailabilityService from './AvailabilityService.js';
import { ROOM_STATUS } from '../utils/constants.js';

class RoomService {
  async listForHotel(hotelId, { includeInactive = false } = {}) {
    const query = { hotelId };
    if (!includeInactive) query.status = ROOM_STATUS.ACTIVE;
    return Room.find(query).sort({ pricePerNight: 1 }).lean();
  }

  async getById(id) {
    const room = await Room.findById(id);
    if (!room) throw ApiError.notFound('Room not found');
    return room;
  }

  async createRoom(hotelId, data) {
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw ApiError.notFound('Hotel not found');
    const payload = {
      hotelId,
      roomType: data.roomType || 'standard',
      name: data.name,
      description: data.description || '',
      pricePerNight: data.pricePerNight,
      capacity: {
        adults: data.capacity?.adults ?? 2,
        children: data.capacity?.children ?? 0,
      },
      bedType: data.bedType || 'king',
      amenities: data.amenities || [],
      images: data.images || [],
      totalUnits: data.totalUnits || 1,
      availableUnits: data.totalUnits || 1,
      status: data.status || ROOM_STATUS.ACTIVE,
      seasonalRates: data.seasonalRates || [],
      weekendMarkupPercent: data.weekendMarkupPercent || 0,
    };
    delete payload.images; // images set via upload flow
    if (Array.isArray(data.images) && data.images.length) payload.images = data.images;
    return Room.create(payload);
  }

  async updateRoom(roomId, data) {
    const room = await Room.findById(roomId);
    if (!room) throw ApiError.notFound('Room not found');
    const allowed = [
      'roomType', 'name', 'description', 'pricePerNight', 'bedType', 'amenities',
      'images', 'status', 'totalUnits', 'seasonalRates', 'weekendMarkupPercent',
    ];
    const patch = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.capacity) patch.capacity = {
      adults: data.capacity.adults ?? room.capacity?.adults ?? 2,
      children: data.capacity.children ?? room.capacity?.children ?? 0,
    };
    if (patch.totalUnits !== undefined && patch.totalUnits !== room.totalUnits) {
      // Adjust freed/consumed units: keep availability proportional.
      const delta = patch.totalUnits - room.totalUnits;
      patch.availableUnits = Math.max(0, (room.availableUnits || 0) + delta);
    }
    Object.assign(room, patch);
    await room.save();
    return room;
  }

  async deleteRoom(roomId) {
    const room = await Room.findById(roomId);
    if (!room) throw ApiError.notFound('Room not found');
    // Soft-delete to preserve booking history integrity.
    room.status = 'inactive';
    await room.save();
    return room;
  }

  async checkAvailability(roomId, checkIn, checkOut, rooms = 1) {
    const room = await this.getById(roomId);
    const report = await AvailabilityService.roomAvailabilityReport(room, checkIn, checkOut, rooms);
    return { ...report, roomId, pricePerNight: room.pricePerNight, capacity: room.capacity };
  }

  /** Rooms usable for checkout along with per-room availability + price estimate. */
  async listForBooking(hotelId, checkIn, checkOut, guests, rooms) {
    const query = { hotelId, status: ROOM_STATUS.ACTIVE };
    if (guests?.adults) {
      query['capacity.adults'] = { $gte: Number(guests.adults) };
    }
    const roomDocs = await Room.find(query).sort({ pricePerNight: 1 }).lean();
    const results = [];
    for (const room of roomDocs) {
      const report = await AvailabilityService.roomAvailabilityReport(room, checkIn, checkOut, Math.max(Number(rooms) || 1, 1));
      results.push({ room: { ...room }, availability: report });
    }
    // Prefer rooms with availability first
    results.sort((a, b) => (b.availability.available ? 1 : 0) - (a.availability.available ? 1 : 0));
    return results;
  }
}

export default new RoomService();