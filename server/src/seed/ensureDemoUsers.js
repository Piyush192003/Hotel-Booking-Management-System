/**
 * Non-destructive demo-account bootstrap for deployed environments.
 *
 * Problem: the full seeder (`seed/seed.js`) is destructive (wipes the DB) and
 * dev-only, so production MongoDB (e.g. on Render) never gets the demo
 * accounts that the login page's "Guest User / Guest Owner" buttons need.
 * Result: POST /api/auth/login → 401 "Incorrect email or password".
 *
 * This module upserts ONLY the three demo accounts, leaving every other
 * collection/document untouched. Safe to run on every server boot behind the
 * SEED_DEMO_USERS flag (opt-in in production, on by default elsewhere).
 *
 *   SEED_DEMO_USERS=true  (Render → Environment → add this variable)
 */
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import { DEMO_PASSWORD, USERS } from './seedData.js';

const DEMO_CREDENTIALS = [
  { email: 'guest@wanderlust.dev', role: ROLES.CUSTOMER, password: DEMO_PASSWORD },
  { email: 'owner@wanderlust.dev', role: ROLES.OWNER, password: DEMO_PASSWORD },
  { email: 'admin123@gmail.com', role: ROLES.ADMIN, password: 'Admin@123' },
];

export async function ensureDemoUsers() {
  const names = Object.fromEntries(USERS.map((u) => [u.email, u.name]));
  const ensured = [];
  for (const cred of DEMO_CREDENTIALS) {
    const email = cred.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(cred.password, 10);
    const result = await User.updateOne(
      { email },
      {
        $set: {
          email,
          name: names[email] || (cred.role === ROLES.ADMIN ? 'Admin Wander' : cred.role === ROLES.OWNER ? 'Aarav Sharma' : 'Kabir Verma'),
          role: cred.role,
          passwordHash,
          isVerified: true,
          isBlocked: false,
        },
        $setOnInsert: { tokenVersion: 0 },
      },
      { upsert: true },
    );
    ensured.push(`${email} (${result.upsertedCount ? 'created' : 'password refreshed'})`);
  }
  return ensured;
}

export default ensureDemoUsers;
