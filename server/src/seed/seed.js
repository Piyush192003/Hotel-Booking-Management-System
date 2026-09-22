/**
 * Wanderlust database seeder.
 * Creates demo users, hotels, rooms, bookings, reviews, wishlists,
 * coupons and notifications. Fictional data only.
 *
 *   npm run seed            -> rebuilds the demo dataset (destructive, dev only)
 *   npm run seed:reset      -> same as seed (kept for explicitness)
 *
 * Demo credentials (development only, see README):
 *   admin123@gmail.com    / Admin@123     (admin)
 *   owner@wanderlust.dev  / password123   (hotel owner)
 *   guest@wanderlust.dev  / password123   (customer)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Hotel, { Room } from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Coupon from '../models/Coupon.js';
import Notification from '../models/Notification.js';
import Wishlist from '../models/Wishlist.js';
import { HOTEL_STATUS, PAYMENT_STATUS, BOOKING_STATUS } from '../utils/constants.js';
import { generateBookingNumber } from '../utils/generate.js';
import { toLocalMidnight, addDays } from '../utils/dateUtils.js';
import { USERS, HOTEL_DEFS, COUPONS, DEMO_PASSWORD, img } from './seedData.js';

async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
  console.log('[seed] existing collections cleared');
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = {};
  for (const u of USERS) {
    const hash = u.password ? await bcrypt.hash(u.password, 10) : passwordHash;
    users[u.email] = await User.create({
      name: u.name,
      email: u.email,
      passwordHash: hash,
      role: u.role,
      phone: u.phone || '',
      isVerified: u.verified !== false,
      lastLoginAt: new Date(),
    });
  }
  console.log(`[seed] ${Object.keys(users).length} users created (password: ${DEMO_PASSWORD})`);
  return users;
}

async function seedHotelsAndRooms(users) {
  const hotelsByName = {};
  let roomCount = 0;
  for (const def of HOTEL_DEFS) {
    const owner = users[def.owner];
    const hotel = await Hotel.create({
      ownerId: owner._id,
      name: def.name,
      slug: def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      tagline: def.tagline,
      description: def.description,
      propertyType: def.propertyType,
      starRating: def.starRating,
      address: `${def.name}, ${def.city}`,
      city: def.city,
      state: def.state,
      country: 'India',
      postalCode: def.postalCode,
      location: { type: 'Point', coordinates: def.location },
      images: [img(`hotel-${def.name}-1`), img(`hotel-${def.name}-2`), img(`hotel-${def.name}-3`)],
      amenities: def.amenities,
      policies: { ...def.policies, houseRules: ['No smoking indoors', 'Quiet hours 10pm-8am'] },
      rating: parseFloat((3.6 + Math.random() * 1.3).toFixed(1)),
      status: HOTEL_STATUS.APPROVED,
      featured: def.featured || false,
      submittedAt: new Date(),
      approvedAt: new Date(),
    });
    hotelsByName[def.name] = hotel;

    const roomDocs = def.rooms.map((r) => ({
      hotelId: hotel._id,
      name: r.name,
      roomType: r.roomType,
      description: `${r.name} at ${def.name} — comfortable, clean and well appointed.`,
      pricePerNight: r.price,
      currency: 'INR',
      capacity: { adults: r.adults, children: r.children },
      bedType: r.bedType,
      amenities: r.amenities || ['wifi', 'air-conditioning'],
      images: [img(`room-${def.name}-${r.name}`, 900, 600)],
      totalUnits: r.totalUnits,
      availableUnits: r.totalUnits,
      status: 'active',
      weekendMarkupPercent: r.weekendMarkupPercent || 0,
    }));
    await Room.insertMany(roomDocs);
    roomCount += roomDocs.length;
    console.log(`[seed] hotel "${def.name}" (${roomDocs.length} rooms)`);
  }
  console.log(`[seed] ${Object.keys(hotelsByName).length} hotels, ${roomCount} room types created`);
  return hotelsByName;
}

async function seedBookingsAndReviews(users) {
  const guestEmails = ['guest@wanderlust.dev', 'sana@example.com', 'rohit@example.com', 'priya@example.com'];
  const guests = guestEmails.map((e) => users[e]);
  const allHotels = await Hotel.find({}).lean();
  const allRooms = await Room.find({}).lean();
  const today = toLocalMidnight(new Date());
  const completedBookings = [];

  let idx = 0;
  for (const g of guests) {
    const room = allRooms[idx % allRooms.length];
    const hotel = allHotels.find((h) => String(h._id) === String(room.hotelId));
    const nights = 2 + (idx % 3);
    const checkIn = addDays(today, -(nights + idx));
    const checkOut = addDays(today, -idx);
    const rate = room.pricePerNight;
    const subtotal = rate * nights;
    const taxes = Math.round(subtotal * 0.12 * 100) / 100;
    const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + taxes + serviceFee) * 100) / 100;
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      userId: g._id,
      hotelId: hotel._id,
      roomId: room._id,
      checkIn,
      checkOut,
      nights,
      guests: { adults: 2, children: 0 },
      rooms: 1,
      guestDetails: { fullName: g.name, email: g.email, phone: '9876543210', country: 'India' },
      pricing: {
        currency: 'INR', nights, basePricePerNight: rate, roomSubtotal: subtotal,
        taxes, serviceFee, couponDiscount: 0, total,
        adjustments: { weekendMarkup: 0, seasonalMarkup: 0 },
      },
      payment: { provider: 'mock', paymentId: `mock_payment_seed_${idx}`, method: 'mock', paidAt: checkIn },
      paymentStatus: PAYMENT_STATUS.PAID,
      bookingStatus: BOOKING_STATUS.COMPLETED,
      completedAt: checkOut,
      checkInCode: `WL-${1000 + idx}`,
    });
    completedBookings.push(booking);
    idx += 1;
  }


  // One upcoming confirmed booking for the demo guest (future stay).
  const upcomingRoom = allRooms[idx % allRooms.length];
  const upcomingHotel = allHotels.find((h) => String(h._id) === String(upcomingRoom.hotelId));
  const upNights = 3;
  const upRate = upcomingRoom.pricePerNight;
  const upSubtotal = upRate * upNights;
  const upTaxes = Math.round(upSubtotal * 0.12 * 100) / 100;
  const upServiceFee = Math.round(upSubtotal * 0.08 * 100) / 100;
  const upTotal = Math.round((upSubtotal + upTaxes + upServiceFee) * 100) / 100;
  await Booking.create({
    bookingNumber: generateBookingNumber(),
    userId: users['guest@wanderlust.dev']._id,
    hotelId: upcomingHotel._id,
    roomId: upcomingRoom._id,
    checkIn: addDays(today, 14),
    checkOut: addDays(today, 14 + upNights),
    nights: upNights,
    guests: { adults: 2, children: 1 },
    rooms: 1,
    guestDetails: {
      fullName: users['guest@wanderlust.dev'].name,
      email: 'guest@wanderlust.dev',
      phone: '9876501234',
      country: 'India',
    },
    pricing: {
      currency: 'INR', nights: upNights, basePricePerNight: upRate, roomSubtotal: upSubtotal,
      taxes: upTaxes, serviceFee: upServiceFee, couponDiscount: 0, total: upTotal,
      adjustments: { weekendMarkup: 0, seasonalMarkup: 0 },
    },
    payment: { provider: 'mock', paymentId: 'mock_payment_seed_future', method: 'mock', paidAt: new Date() },
    paymentStatus: PAYMENT_STATUS.PAID,
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    checkInCode: 'WL-3000',
  });
  console.log(`[seed] ${completedBookings.length + 1} bookings created`);

  // Reviews attached to completed bookings (one per booking).
  const titles = ['Wonderful stay', 'Great value', 'Lovely location', 'Nice rooms', 'Good hospitality', 'Peaceful'];
  const comments = [
    'Beautiful property and amazing staff. Would definitely visit again.',
    'Good location, comfortable rooms and a solid breakfast.',
    'The views were stunning and the service was very attentive.',
    'Clean, spacious and great value for money.',
    'Memorable stay with lovely hospitality.',
    'Quiet and peaceful — perfect for a relaxing getaway.',
  ];
  const reviews = completedBookings.slice(0, 6).map((b, i) => {
    const rating = 3 + (i % 3);
    return {
      userId: guests[i % guests.length]._id,
      hotelId: b.hotelId,
      bookingId: b._id,
      bookingNumber: b.bookingNumber,
      rating,
      cleanliness: rating,
      location: Math.min(rating + 1, 5),
      service: rating,
      value: rating,
      title: titles[i % titles.length],
      comment: comments[i % comments.length],
      status: 'active',
    };
  });
  await Review.insertMany(reviews);

  // Recompute denormalised hotel ratings from reviews.
  for (const h of allHotels) {
    const agg = await Review.aggregate([
      { $match: { hotelId: h._id, status: 'active' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg[0]) {
      await Hotel.findByIdAndUpdate(h._id, {
        $set: { rating: Math.round(agg[0].avg * 10) / 10, reviewCount: agg[0].count },
      });
    }
  }
  console.log(`[seed] ${reviews.length} reviews created, hotel ratings recalculated`);
  return allHotels;
}


async function seedWishlists(users, hotelsByName) {
  const docs = [
    { userId: users['guest@wanderlust.dev']._id, hotelId: hotelsByName['The Coral Cove Resort']?._id },
    { userId: users['guest@wanderlust.dev']._id, hotelId: hotelsByName['Himalayan Pine Retreat']?._id },
    { userId: users['sana@example.com']._id, hotelId: hotelsByName['Backwater Houseboat Retreat']?._id },
  ].filter((d) => d.hotelId);
  if (docs.length) await Wishlist.insertMany(docs);
  console.log(`[seed] ${docs.length} wishlist entries created`);
}

async function seedCoupons(users) {
  await Coupon.insertMany(
    COUPONS.map((c) => ({ ...c, createdBy: users['admin123@gmail.com']._id })),
  );
  console.log(`[seed] ${COUPONS.length} coupons created`);
}

async function seedNotifications(users) {
  const docs = [
    {
      userId: users['guest@wanderlust.dev']._id,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      message: 'Your upcoming stay is confirmed. We look forward to hosting you!',
      link: '/dashboard/bookings',
    },
    {
      userId: users['guest@wanderlust.dev']._id,
      type: 'review_request',
      title: 'How was your stay?',
      message: 'You recently completed a stay — share your experience with a review.',
      link: '/dashboard/reviews',
    },
    {
      userId: users['owner@wanderlust.dev']._id,
      type: 'property_approved',
      title: 'Property approved',
      message: 'Your property has been approved and is now live on Wanderlust.',
      link: '/owner/properties',
    },
    {
      userId: users['admin123@gmail.com']._id,
      type: 'system',
      title: 'Welcome to Wanderlust Admin',
      message: 'Platform analytics, moderation tools and audit logs are ready.',
      link: '/admin',
      isRead: true,
      readAt: new Date(),
    },
  ];
  await Notification.insertMany(docs);
  console.log(`[seed] ${docs.length} notifications created`);
}

async function main() {
  await connectDatabase();
  // Demo seeding is destructive by design: it always rebuilds the demo dataset.
  await clearCollections();
  const users = await seedUsers();
  const hotelsByName = await seedHotelsAndRooms(users);
  await seedBookingsAndReviews(users);
  await seedWishlists(users, hotelsByName);
  await seedCoupons(users);
  await seedNotifications(users);

  console.log('=================================================');
  console.log(' Wanderlust seed complete — demo accounts');
  console.log('=================================================');
  console.log(` Hotels   : ${Object.keys(hotelsByName).length} properties across 10 owners`);
  console.log(' Admin    : admin123@gmail.com / Admin@123');
  console.log(' Owner    : owner@wanderlust.dev / password123 (8 more: *.owner@wanderlust.dev)');
  console.log(' Customer : guest@wanderlust.dev / password123');
  console.log('=================================================\n');
}

main()
  .then(() => disconnectDatabase())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    try {
      await disconnectDatabase();
    } catch {
      /* already disconnected */
    }
    process.exit(1);
  });

