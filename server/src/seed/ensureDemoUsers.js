import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Hotel, { Room } from '../models/Hotel.js';
import { ROLES, HOTEL_STATUS } from '../utils/constants.js';
import { DEMO_PASSWORD, USERS } from './seedData.js';

const DEMO_CREDENTIALS = [
  { email: 'guest@wanderlust.dev', role: ROLES.CUSTOMER, password: DEMO_PASSWORD },
  { email: 'owner@wanderlust.dev', role: ROLES.OWNER, password: DEMO_PASSWORD },
  { email: 'admin123@gmail.com', role: ROLES.ADMIN, password: 'Admin@123' },
];

const pic = (seed, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const mkRoom = (name, roomType, price, adults, children, bedType, totalUnits) => ({
  name, roomType,
  description: `${name} - comfortable, clean and well appointed.`,
  pricePerNight: price, currency: 'INR',
  capacity: { adults, children }, bedType,
  amenities: ['wifi', 'air-conditioning'],
  images: [pic(`wl-demo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, 900, 600)],
  totalUnits, availableUnits: totalUnits,
  status: 'active', weekendMarkupPercent: 10,
});

export async function ensureDemoUsers() {
  const names = Object.fromEntries(USERS.map((u) => [u.email, u.name]));
  const ensured = [];
  for (const cred of DEMO_CREDENTIALS) {
    const email = cred.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(cred.password, 10);
    const result = await User.updateOne(
      { email },
      { $set: {
          email,
          name: names[email] || 'Demo User',
          role: cred.role, passwordHash,
          isVerified: true, isBlocked: false,
        },
        $setOnInsert: { tokenVersion: 0 } },
      { upsert: true },
    );
    ensured.push(`${email} (${result.upsertedCount ? 'created' : 'password refreshed'})`);
  }
  return ensured;
}

const H = (slug, name, tagline, description, propertyType, starRating, city, state, postalCode, lng, lat, rating, reviewCount, featured, amenities) => ({
  slug, name, tagline, description, propertyType, starRating, city, state, postalCode,
  location: [lng, lat], rating, reviewCount, featured, amenities,
});

const DEMO_HOTELS = [
  H('demo-coral-cove-resort-goa', 'The Coral Cove Resort', 'Beachfront luxury in North Goa',
    'A stunning beachfront resort on the shores of North Goa. Ocean-view suites, an infinity pool overlooking the Arabian Sea, award-winning seafood dining and a world-class spa.',
    'resort', 5, 'North Goa', 'Goa', '403515', 73.7503, 15.6027, 4.7, 412, true,
    ['wifi', 'pool', 'spa', 'restaurant', 'bar', 'air-conditioning', 'parking', 'beachfront', 'room-service']),
  H('demo-himalayan-pine-retreat-manali', 'Himalayan Pine Retreat', 'Snow-capped views in Old Manali',
    'A cosy mountain retreat wrapped in deodar forests with sweeping views of snow-capped peaks. Bonfire evenings, apple-orchard walks and hearty Himachali hospitality.',
    'hotel', 4, 'Manali', 'Himachal Pradesh', '175131', 77.1734, 32.2432, 4.5, 328, true,
    ['wifi', 'restaurant', 'parking', 'fireplace', 'mountain-view', 'room-service']),
  H('demo-royal-rajput-palace-jaipur', 'Royal Rajput Palace', 'Heritage grandeur in the Pink City',
    'A lovingly restored heritage palace near the old city of Jaipur. Courtyard pools, frescoed suites, folk performances every evening and royal Rajasthani thalis under the stars.',
    'hotel', 5, 'Jaipur', 'Rajasthan', '302002', 75.7873, 26.9124, 4.8, 521, true,
    ['wifi', 'pool', 'spa', 'restaurant', 'parking', 'heritage', 'room-service']),
  H('demo-serene-backwater-villa-alleppey', 'Serene Backwater Villa', 'Slow mornings on the Alleppey canals',
    'A tranquil villa on the backwaters of Alleppey with private sit-outs over the water, canoe rides at dawn, Kerala sadya on banana leaf and Ayurvedic massages on request.',
    'villa', 4, 'Alleppey', 'Kerala', '688001', 76.3388, 9.4981, 4.6, 264, false,
    ['wifi', 'pool', 'breakfast', 'houseboat-access', 'parking', 'garden']),
  H('demo-desert-star-camp-jaisalmer', 'Desert Star Camp', 'Sleep under a billion stars in Jaisalmer',
    'Luxury tents on the Sam sand dunes outside Jaisalmer. Camel safaris at sunset, Kalbeliya dance around the bonfire, and a sky so clear the Milky Way feels close enough to touch.',
    'cottage', 4, 'Jaisalmer', 'Rajasthan', '345001', 70.9126, 26.9157, 4.4, 198, false,
    ['restaurant', 'bonfire', 'desert-safari', 'parking', 'cultural-shows']),
  H('demo-tea-trail-bungalow-munnar', 'Tea Trail Bungalow', 'Wake up inside a working tea estate',
    'A colonial-era bungalow wrapped in the rolling tea gardens of Munnar. Estate walks with the resident naturalist, fresh tea tastings, and mist every afternoon.',
    'homestay', 3, 'Munnar', 'Kerala', '685612', 77.0595, 10.0889, 4.5, 176, false,
    ['wifi', 'breakfast', 'mountain-view', 'fireplace', 'parking', 'garden']),
  H('demo-ganga-steps-inn-rishikesh', 'Ganga Steps Riverside Inn', 'Yoga, rafting and riverside peace',
    'A bright riverside inn a short walk from the ghats of Rishikesh. Sunrise yoga on the terrace, guided rafting trips, sattvik cafe food and Ganga aarti every evening.',
    'guesthouse', 3, 'Rishikesh', 'Uttarakhand', '249201', 78.2676, 30.0869, 4.3, 243, false,
    ['wifi', 'yoga-deck', 'restaurant', 'river-view', 'trek-desk']),
  H('demo-french-quarter-villa-pondicherry', 'French Quarter Heritage Villa', 'Colonial pastels in Pondicherry',
    'A whitewashed villa on a quiet French-quarter lane with a private courtyard pool, cafe-style breakfasts and bicycles to explore the promenade and Auroville.',
    'villa', 4, 'Pondicherry', 'Puducherry', '605001', 79.9339, 11.9139, 4.6, 187, false,
    ['wifi', 'pool', 'breakfast', 'bicycles', 'courtyard', 'parking']),
  H('demo-lake-pichola-haveli-udaipur', 'Lake Pichola Heritage Haveli', 'Mirror-water serenity in Udaipur',
    'A lakeside haveli with arched windows framing Lake Pichola. Rooftop dinners with palace views, boat rides at dusk and Mewari hospitality in the city of lakes.',
    'hotel', 4, 'Udaipur', 'Rajasthan', '313001', 73.6835, 24.5854, 4.7, 356, true,
    ['wifi', 'restaurant', 'rooftop', 'lake-view', 'parking', 'room-service']),
  H('demo-city-central-suites-mumbai', 'City Central Suites', 'Business comfort in the heart of Mumbai',
    'Modern serviced suites near BKC with fast wifi, a 24x7 cafe, compact gym and airport transfers. Built for business travellers who want comfort without fuss.',
    'apartment', 4, 'Mumbai', 'Maharashtra', '400051', 72.8777, 19.076, 4.2, 289, false,
    ['wifi', 'gym', 'restaurant', 'airport-shuttle', 'workspace', 'parking']),
  H('demo-cloud-nine-homestay-shillong', 'Cloud Nine Homestay', 'Pine hills and rain-washed skies',
    'A wooden Khasi-style homestay above Shillong with bonfire evenings, sunrise runs to Shillong Peak and home-baked goodies from your host family.',
    'homestay', 3, 'Shillong', 'Meghalaya', '793001', 91.8834, 25.5788, 4.4, 132, false,
    ['wifi', 'breakfast', 'mountain-view', 'fireplace', 'parking']),
  H('demo-marina-bay-hostel-chennai', 'Marina Bay Backpacker Hostel', 'Budget bunks minutes from the beach',
    'A lively backpacker hostel near Marina Beach with dorms and private pods, coworking corners, weekly city walks and filter coffee every morning.',
    'hostel', 2, 'Chennai', 'Tamil Nadu', '600004', 80.2785, 13.0507, 4.1, 214, false,
    ['wifi', 'coworking', 'lockers', 'common-kitchen', 'beach-access']),
];

const DEMO_ROOMS = {
  'demo-coral-cove-resort-goa': [
    mkRoom('Ocean View Suite', 'suite', 9500, 3, 1, 'king', 6),
    mkRoom('Deluxe Seaview Room', 'deluxe', 6200, 2, 1, 'queen', 14),
    mkRoom('Poolside Cottage', 'cottage', 7800, 2, 0, 'king', 8) ],
  'demo-himalayan-pine-retreat-manali': [
    mkRoom('Valley View Suite', 'suite', 7200, 3, 1, 'king', 5),
    mkRoom('Pine Deluxe Room', 'deluxe', 4800, 2, 1, 'queen', 12),
    mkRoom('Orchard Standard', 'standard', 2900, 2, 0, 'double', 10) ],
  'demo-royal-rajput-palace-jaipur': [
    mkRoom('Maharaja Suite', 'suite', 12000, 3, 2, 'king', 4),
    mkRoom('Heritage Deluxe', 'deluxe', 7500, 2, 1, 'queen', 10),
    mkRoom('Courtyard Room', 'standard', 4200, 2, 0, 'double', 12) ],
  'demo-serene-backwater-villa-alleppey': [
    mkRoom('Lakeface Villa Suite', 'villa', 8900, 4, 2, 'king', 3),
    mkRoom('Canal View Deluxe', 'deluxe', 5600, 2, 1, 'queen', 6) ],
  'demo-desert-star-camp-jaisalmer': [
    mkRoom('Royal Desert Tent', 'suite', 6800, 2, 1, 'king', 8),
    mkRoom('Dune Deluxe Tent', 'deluxe', 4500, 2, 0, 'queen', 12) ],
  'demo-tea-trail-bungalow-munnar': [
    mkRoom('Estate Suite', 'suite', 5400, 2, 1, 'king', 4),
    mkRoom('Garden Deluxe', 'deluxe', 3600, 2, 0, 'queen', 6) ],
  'demo-ganga-steps-inn-rishikesh': [
    mkRoom('River View Deluxe', 'deluxe', 3800, 2, 1, 'queen', 8),
    mkRoom('Garden Standard', 'standard', 2200, 2, 0, 'double', 10) ],
  'demo-french-quarter-villa-pondicherry': [
    mkRoom('Promenade Suite', 'suite', 7600, 2, 1, 'king', 3),
    mkRoom('Courtyard Deluxe', 'deluxe', 5100, 2, 0, 'queen', 5) ],
  'demo-lake-pichola-haveli-udaipur': [
    mkRoom('Lakeface Royal Suite', 'suite', 9800, 3, 1, 'king', 4),
    mkRoom('Haveli Deluxe', 'deluxe', 5900, 2, 1, 'queen', 9) ],
  'demo-city-central-suites-mumbai': [
    mkRoom('Executive Studio', 'studio', 6500, 2, 0, 'queen', 10),
    mkRoom('Family Suite', 'family', 8200, 4, 2, 'king', 6) ],
  'demo-cloud-nine-homestay-shillong': [
    mkRoom('Cloud View Deluxe', 'deluxe', 3200, 2, 1, 'queen', 6),
    mkRoom('Pine Standard', 'standard', 2000, 2, 0, 'double', 9) ],
  'demo-marina-bay-hostel-chennai': [
    mkRoom('4-Bed Pod Dorm', 'dormitory', 799, 1, 0, 'bunk', 10),
    mkRoom('Private Pod Deluxe', 'deluxe', 2400, 2, 0, 'double', 8) ],
};

export async function ensureDemoHotels() {
  const owner = await User.findOne({ email: 'owner@wanderlust.dev' });
  if (!owner) throw new Error('demo owner missing - run ensureDemoUsers first');
  let created = 0;
  let refreshed = 0;
  for (const def of DEMO_HOTELS) {
    const res = await Hotel.updateOne(
      { slug: def.slug },
      { $set: {
          ...def,
          ownerId: owner._id,
          address: `${def.name}, ${def.city}`,
          country: 'India',
          images: [pic(def.slug), pic(`${def.slug}-2`), pic(`${def.slug}-3`)],
          status: HOTEL_STATUS.APPROVED,
          policies: {
            checkInTime: '14:00', checkOutTime: '11:00',
            cancellation: { freeCancellationHours: 48, cancellationFeePercent: 15 },
            houseRules: ['No smoking indoors', 'Quiet hours 10pm-8am'],
            petPolicy: 'No pets allowed',
          },
          submittedAt: new Date(),
        } },
      { upsert: true },
    );
    const hotel = await Hotel.findOne({ slug: def.slug });
    await Room.deleteMany({ hotelId: hotel._id });
    await Room.insertMany((DEMO_ROOMS[def.slug] || []).map((r) => ({ ...r, hotelId: hotel._id })));
    if (res.upsertedCount) created += 1;
    else refreshed += 1;
  }
  return { created, refreshed, total: DEMO_HOTELS.length };
}

export async function ensureDemoContent() {
  const users = await ensureDemoUsers();
  const hotels = await ensureDemoHotels();
  return { users, hotels };
}

export default ensureDemoContent;