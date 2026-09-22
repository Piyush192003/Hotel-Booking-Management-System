import mongoose from 'mongoose';
import { HOTEL_STATUS, ROOM_STATUS } from '../utils/constants.js';

// ---------- Hotel ----------
const hotelSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Hotel name is required'], trim: true, minlength: 3, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    tagline: { type: String, default: '', maxlength: 160 },
    description: { type: String, required: true, minlength: 20, maxlength: 5000 },
    propertyType: {
      type: String,
      enum: ['hotel', 'resort', 'villa', 'apartment', 'guesthouse', 'homestay', 'hostel', 'cottage'],
      default: 'hotel',
    },
    starRating: { type: Number, min: 1, max: 5, default: 3 },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, default: '', trim: true },
    country: { type: String, default: 'India', trim: true },
    postalCode: { type: String, default: '', trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true, default: [0, 0] }, // [lng, lat]
    },
    images: [{ type: String }],
    amenities: [{ type: String }],
    policies: {
      checkInTime: { type: String, default: '14:00' },
      checkOutTime: { type: String, default: '11:00' },
      cancellation: {
        freeCancellationHours: { type: Number, default: 48 },
        cancellationFeePercent: { type: Number, default: 25 }, // % charged when inside the free window
      },
      houseRules: [{ type: String }],
      petPolicy: { type: String, default: 'No pets allowed' },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(HOTEL_STATUS),
      default: HOTEL_STATUS.PENDING,
      index: true,
    },
    featured: { type: Boolean, default: false },
    rejectionReason: { type: String, default: '' },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

hotelSchema.index({ location: '2dsphere' });
hotelSchema.index({ city: 1, status: 1 });
hotelSchema.index({ status: 1, rating: -1 });
hotelSchema.index({ propertyType: 1, status: 1 });
hotelSchema.index({ ownerId: 1, status: 1 });
hotelSchema.index({ featured: 1, status: 1 });
hotelSchema.index({ name: 'text', city: 'text', state: 'text', country: 'text', tagline: 'text' });

// ---------- Room ----------
const roomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    roomType: {
      type: String,
      enum: ['standard', 'deluxe', 'suite', 'family', 'dormitory', 'studio', 'presidential', 'villa', 'cottage'],
      default: 'standard',
    },
    name: { type: String, required: [true, 'Room name is required'], trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    pricePerNight: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    capacity: {
      adults: { type: Number, required: true, min: 1, max: 16 },
      children: { type: Number, default: 0, min: 0, max: 8 },
    },
    bedType: {
      type: String,
      enum: ['king', 'queen', 'twin', 'double', 'single', 'bunk', 'sofa'],
      default: 'king',
    },
    amenities: [{ type: String }],
    images: [{ type: String }],
    totalUnits: { type: Number, required: true, min: 1, max: 1000, default: 1 },
    availableUnits: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: Object.values(ROOM_STATUS), default: ROOM_STATUS.ACTIVE, index: true },
    // Seasonal pricing (optional)
    seasonalRates: [
      {
        name: { type: String, default: '' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        pricePerNight: { type: Number, required: true, min: 1 },
      },
    ],
    weekendMarkupPercent: { type: Number, default: 0, min: 0, max: 200 },
  },
  { timestamps: true },
);

roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, roomType: 1 });
roomSchema.index({ pricePerNight: 1 });
roomSchema.index({ 'capacity.adults': 1 });
roomSchema.index({ availableUnits: 1 });

// ---------- BookingSlot (per-room per-date availability ledger) ----------
const bookingSlotSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    date: { type: Date, required: true }, // local midnight of a booked night
    unitsBooked: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Unique (roomId, date) — the race-free primitive that prevents double booking.
bookingSlotSchema.index({ roomId: 1, date: 1 }, { unique: true });
bookingSlotSchema.index({ hotelId: 1 });
bookingSlotSchema.index({ date: 1 });

const Hotel = mongoose.model('Hotel', hotelSchema);
const Room = mongoose.model('Room', roomSchema);
const BookingSlot = mongoose.model('BookingSlot', bookingSlotSchema);

export { Hotel, Room, BookingSlot };
export default Hotel;