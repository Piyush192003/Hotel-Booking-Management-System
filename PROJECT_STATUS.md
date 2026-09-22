# Wanderlust — Project Status

> Last updated: 31 Aug 2026

## Project overview

Wanderlust is a hotel booking platform (India-focused) with:

- **Backend** (`server/`): Node.js + Express + Mongoose, JWT access/refresh cookie auth, service-layer architecture, mock Razorpay payments, console email mode in development, Vitest tests, ESLint flat config.
- **Frontend** (`client/`): React 18 + Vite, Redux Toolkit thunks, React Router v6, Tailwind CSS, React Hook Form + Zod, Vitest + RTL, ESLint flat config.

---

## Phase checklist

### ✅ Phase 1 — Foundation & infrastructure
- Server: config (`env.js`, `db.js`), middleware (auth, error handler, rate limiter, upload, validate), utilities (`ApiError`, `ApiResponse`, `constants`, `asyncHandler`, `dateUtils`), envelope `{ success, message, data, meta }`.
- Client: Vite + Tailwind + PostCSS, Redux store, `apiClient` with 401 auto-refresh queue, UI kit (Button, Field, Badge, Modal, Pagination, RatingStars, States, Loading, LoadingSkeleton, EmptyState, ErrorState, Toaster), layouts (Navbar, Footer, MobileMenu, MainLayout, DashboardLayout), routing (`AppRoutes`, `ProtectedRoute`, `RoleRoute`).
- **Validation:** server boots against local MongoDB (`http://localhost:5000`), `GET /api/health` 200.

### ✅ Phase 2 — Auth
- Server: `AuthService`, auth controllers/routes (register, login, refresh, logout, me, change-password, forgot/reset-password, verify-email, dev codes), rate limiting.
- Client: `authSlice`, validators (`authSchemas.js`), pages: Login, Register, ForgotPassword, ResetPassword; route protection + role gating.

### ✅ Phase 3 — Hotels & search
- Server: `HotelService`, `RoomService`, `AvailabilityService`, `PricingService`, search routes (destination, dates, guests, price, rating, amenities, sort), collections, public hotel detail, rooms + availability.
- Client: HotelCard, SearchBar, Home, HotelList (filters, sorting, pagination), HotelDetail (gallery, availability widget, booking links, reviews, wishlist).

### ✅ Phase 4 — Bookings & payments
- Server: `BookingService` (quote, create, cancel, status transitions, emails), `PaymentService` (mock Razorpay order/verify/refund), webhook, admin/owner booking views.
- Client: Checkout (stay summary, guest info, coupon field, mock payment), my-bookings list/detail with cancellation, dashboard stats.

### ✅ Phase 5 — Reviews, wishlist, notifications, coupons
- Server: review create/update/delete/reply/moderate + lists, `WishlistService`, `NotificationService`, `CouponService` (validate + admin CRUD).
- Client: MyReviews, Wishlist, Notifications pages; ReviewCard; wishlist toggle on HotelDetail; coupon validation in Checkout.

### ✅ Phase 6 — Owner dashboard
- Server: `/owner/dashboard|trends|bookings|reviews|revenue|properties/:id` + owner hotel CRUD via hotel routes, `AnalyticsService.ownerMetrics/ownerTrends`.
- Client: OwnerDashboard, OwnerProperties, OwnerPropertyForm (create/edit), OwnerPropertyDetail (delete), OwnerBookings, OwnerRevenue, OwnerReviews (reply flow).

### ✅ Phase 7 — Admin dashboard
- Server: `/admin/dashboard|trends|users|hotels|bookings|payments|refunds|reviews|audit-logs` + coupon admin CRUD; approval/rejection notifications.
- Client: AdminDashboard (KPIs + attention queues), AdminUsers (block/unblock), AdminHotels (approve/reject/suspend), AdminBookings, AdminPayments, AdminReviews (moderate), AdminCoupons (CRUD), AdminReports (trends), AdminAuditLogs.
---

## This session (resume after interrupted inference)

### Repairs
- `Home.jsx` — rewrote corrupted file (duplicate `Section`/`Home` definitions, broken JSX).
- `HotelList.jsx` — completed truncated implementation (fetch, filters, pagination, sorting); fixed effect deps `[params, filters]`.
- `HotelDetail.jsx` — fixed broken `failed` branch + undefined `images` reference.
- Import-path fixes: `Input` → `components/ui/Field`, `Spinner` → `components/ui/Loading`, `toggleMobileMenu` → `store/uiSlice`.
- Created missing `client/src/validators/authSchemas.js`, `client/src/test/setup.js`, ESLint flat configs for `server/` and `client/`.
- Server route fixes:
  - `adminRoutes.js` — `PATCH /admin/hotels/:id/status` now validates body via `reviewHotelValidator` (was validating query params) + missing import.
  - `hotelRoutes.js` — imported `reviewHotelValidator` for hotel status route.

### New pages (all wired in `AppRoutes.jsx`)
- Auth: ForgotPassword, ResetPassword · Hotels: HotelDetail · Bookings: Checkout
- Dashboard: DashboardHome, MyBookings, BookingDetail, Wishlist, MyReviews, Notifications, Profile
- Owner: OwnerDashboard, OwnerProperties, OwnerPropertyForm, OwnerPropertyDetail, OwnerBookings, OwnerRevenue, OwnerReviews
- Admin: AdminDashboard, AdminUsers, AdminHotels, AdminBookings, AdminPayments, AdminReviews, AdminCoupons, AdminReports, AdminAuditLogs

### API contract alignment (client ↔ server)
- MyReviews → `GET /reviews/my` (not `/mine`). All pages use the standard `{ data, meta }` envelope via `apiGet/apiPost/apiPatch/apiDelete`.
- AdminUsers block/unblock → `PATCH /admin/users/:id/block` with `{ blocked }`.
- AdminHotels approve/reject/suspend → `PATCH /admin/hotels/:id/status` with `{ status }`.
- Owner hotel CRUD → `/owner/hotels` (list/get) + `POST|PUT|DELETE /hotels/:id`.
- AdminPayments/AdminReviews/AdminReports → `/admin/payments|reviews|trends`.
- AdminCoupons CRUD → `/coupons` with `{ code, discountType, discountValue, startDate, endDate, ... }`.

### Lint intuition fix
- Added `eslint-plugin-react` + `react/jsx-uses-vars` + `react/jsx-uses-react` to `client/eslint.config.js`. Core `no-unused-vars` does not count JSX element names as usage → ~191 false "unused" warnings. After the fix + removing 14 real unused imports/vars, client lint is **0 problems**.

### Runtime bug fixes (found while running the app)
- **`HotelService.searchHotels` — `$first` aggregation crash** (`$first's argument must be an array, but is bool`): the `$group` captured `hotel: { $first: '$$ROOT' }` (an object), then applied `$first` to its scalar fields (`featured`, `rating`, `reviewCount`, `createdAt`). Fixed by referencing the fields directly (`'$hotel.featured'` etc.). Only triggered once the DB was seeded.
- **`HotelService.searchHotels` — `minPrice`/`maxPrice` returned arrays** in the non-availability path: `$min: '$rooms.pricePerNight'` in a `$group` accumulator compares per-doc values, and with `$rooms` as the full array it returned the whole array. Replaced with a `$reduce`/`$cond` accumulator that normalizes both the array form (no dates) and the unwound scalar form (dates). Verified: scalar `minPrice`/`maxPrice` in both paths.
- **`HotelService.collections` — featured/topRated cards had no price**: the two `Hotel.find()` collections lacked any price field (Hotel model has no `startingPrice`), so Home cards rendered ₹0. Replaced all four list queries with a single `roomLookup` aggregation that attaches `minPrice` from active rooms (featured, topRated, budget, luxury) — also removed duplicated budget/luxury pipelines. Added missing `ROOM_STATUS` import.
- Validation after fixes: server boots, `GET /api/hotels` returns 12 seeded hotels with scalar prices, `GET /api/hotels/collections` returns priced featured/topRated/budget/luxury lists, date-based availability search works, `POST /api/auth/login` (guest@wanderlust.dev) → 200. Server lint: 0 errors; server tests: 20 passed.

---

## Running state

- **Backend:** `http://localhost:5000` (node `src/server.js`) — MongoDB connected, mock payments, console email.
- **Frontend:** `http://localhost:5173` (Vite) — proxies `/api` → `:5000`.
- **Seeded data:** 12 hotels / 34 room types / 5 bookings / 4 reviews / 5 coupons / demo users.
- **Demo accounts (password123):**
  - admin@wanderlust.dev (admin)
  - owner@wanderlust.dev (owner)
  - guest@wanderlust.dev (customer)
- Re-run seed anytime: `cd server && npm run seed`.

### Theme — "Sapphire Coast" (Emerald + Sand) restyle

Replaced the default blue/gray theme with a premium coastal-resort palette, applied via design tokens so every screen re-themes consistently:

- **`client/tailwind.config.js`** — new scales:
  - `brand`: emerald → teal (primary CTA `#1a7a6a`, deep emerald `#0d5c48`, glow shadow `brand-glow`)
  - `sand`: warm cream/golden neutrals (`#f4ecdd` core) for page backgrounds and accents
  - `ink`: warm olive-charcoal text/borders (replaces cold blue-gray)
  - `display` font → **Fraunces** (elegant hospitality serif, loaded in `index.html`), fallback Plus Jakarta Sans
  - Gradients: `brand-gradient` (CTAs/logo), `hero-gradient` (home hero overlay), plus refined card/float shadows and radii
- **`client/src/index.css`** — body on sand, warm scrollbars, brand selection color, focus rings offset on sand, polished `input-base`/`card-base`
- **Signature surfaces restyled:**
  - Home hero: emerald `hero-gradient` over photo, serif headline, glass eyebrow pill, trust-checkmark row, search panel with brand ring
  - Navbar: sand-glass (blurred sand background), gradient logo mark, emerald active nav pill, two-tone wordmark
  - Footer: deep-emerald band with sand text and gradient logo chip
  - DashboardLayout: sand sidebar/header, gradient active nav pills
  - Button: gradient primary with glow shadow + press animation; refined secondary/outline
  - Auth pages (Login/Register/Forgot/Reset): gradient logo mark, sand-bordered `shadow-float` cards, warm demo box
  - HotelCard featured pill + SearchBar submit: gradient with glow
  - Modal header, Pagination active page, EmptyState: sand/brand accents
- **Validation:** client lint 0 problems, `vite build` success, 23 client tests pass.

---

## Validation (all green)

| Check | Command | Result |
|---|---|---|
| Server boot | `node src/server.js` | ✅ API on http://localhost:5000 |
| API smoke | `GET /api/health`, `GET /api/hotels` | ✅ 200, envelope correct |
| Server modules | `import('./src/routes/index.js')` | ✅ `ROUTES OK` |
| Client build | `npm run build` | ✅ built in ~8s |
| Client tests | `npm test` | ✅ 23 passed |
| Server tests | `npm test` | ✅ 20 passed |
| Client lint | `npm run lint` | ✅ 0 problems |
| Server lint | `npm run lint` | ✅ 0 errors, 38 warnings (pre-existing unused vars, untouched files) |

---

## Known remaining work / notes

- **Server lint warnings (38, non-blocking):** pre-existing unused imports/params (`PricingService.js` → `Coupon`, `ReviewService.js` → `REVIEW_MAX_PER_BOOKING`, `TokenService.js`, `bookingValidator.js`, etc.). Left untouched as pre-existing working code.
- **Owner room management UI** not built yet (server API exists: `POST/GET /hotels/:hotelId/rooms`).
- **Upload UI** not wired client-side (`POST /upload/images` exists; hotel forms take image URLs).
- **Coupon application** wired to `/coupons/validate`; end-to-end discount on a real booking awaits final verification against the mock payment flow.
- **No git commits yet** (all files untracked) — recommend an initial commit.
- **No `server/.env`** — dev defaults: `mongodb://127.0.0.1:27017/wanderlust`, mock payments, console emails. Seed: `npm run seed` (server).
- **OneDrive "Files On-Demand"** can intermittently serve dehydrated content to tooling. If `eslint .` reports stale "unused" warnings, lint specific paths (e.g. `npx eslint src`) to force fresh reads.

## How to run

```bash
# Backend (needs local MongoDB)
cd server && npm install && npm run dev     # http://localhost:5000

# Frontend
cd client && npm install && npm run dev     # http://localhost:5173 (proxies /api → :5000)
```

---

## Blank-page incident (resolved)

**Symptom:** browser showed a blank page at http://localhost:5173 while `vite build` passed.

**Diagnosis (layer by layer):**
1. No UTF-16/BOM files in `client/src` — encoding theory ruled out.
2. Dev server served valid transformed modules (`/src/pages/Home.jsx` → 45 KB, 0 null bytes).
3. **jsdom smoke test** (`src/test/app.smoke.test.jsx`) mounted `<App/>` with the real store — **passed**, proving no runtime crash in React code.

**Root cause:** the long-running Vite dev server kept a stale/corrupted module graph after dozens of atomic file rewrites (theme restyle). Clean restart fixed it.

**Post-restart verification (all ✅):**
- `GET /` → 200, `#root` present
- `/src/main.jsx` → 200 (2819 B); `/src/index.css` → 200 (50 KB compiled Tailwind)
- `GET /api/hotels?limit=2` via proxy → 12 seeded hotels
- `GET /api/health` → healthy; MongoDB connected; mock payment mode
- Browser launched at http://localhost:5173

**Lesson:** after large multi-file rewrites, restart the dev server before diagnosing deeper.

---

## Hero overlay fix (user-reported: "green blocks the background image")

**Symptom:** home hero background photo was barely visible behind a heavy green wash.

**Root cause (two stacked layers):**
1. `<img>` rendered at `opacity-50`
2. `bg-hero-gradient` overlay at near-opaque alphas `.96 → .88 → .72`

Combined coverage left the photo at effectively ~5–10% visibility.

**Fix:**
- `client/src/pages/Home.jsx` — photo opacity `50 → 90`
- `client/tailwind.config.js` — `hero-gradient` rebuilt as a **left-weighted horizontal scrim** (105deg): `rgba(9,61,49,.78) → .45 → .18 → .08` (was 160deg at `.96/.88/.72`). Dark-enough on the left for the white headline, nearly clear on the right where the pool photo shows.

**Validation:** `vite build` ✅ · smoke test 1/1 ✅ · `GET /` 200 ✅ · new gradient confirmed in served CSS ✅ · backend on :5000 + proxy ✅.

---

## Proper authentication flow (signup no longer auto-logs-in)

**User report:** after signup the app went straight to the dashboard, skipping login/verification.

**Security flaws found & fixed:**
1. `POST /auth/register` issued access+refresh cookies for an **unverified** account (auto-login defeated the whole email-verification system).
2. Client `registerUser.fulfilled` set `status: 'authenticated'` and the Register page navigated to `/dashboard`.
3. `/auth/verify-email` route **did not exist client-side** even though the emailed link pointed at it — the `verifyEmail` thunk was dead code.
4. Server `verifyEmailValidator` didn't require `email` → `findOne({ email: undefined })` could match an arbitrary user.

**New flow: signup → verify email → login → (role-gated routes)**
- **Server:** `AuthService.register` no longer issues tokens; `authController.register` no longer sets cookies. `AuthService.login` now returns `403 EMAIL_NOT_VERIFIED` for unverified accounts. `verifyEmailValidator` requires a valid `email`.
- **Client:** `authSlice.registerUser` keeps the user guest and stores only `devVerificationCode`; login rejections now carry `{ message, code }` via new `getApiErrorCode()` in `apiClient.js`.
- **New page** `client/src/pages/auth/VerifyEmail.jsx` at `/auth/verify-email`: auto-verifies from the emailed link (`?token=&email=`), or shows a code-entry form (dev code banner in dev mode); on success redirects to Login with a "verified ✅" banner.
- **Register.jsx** redirects to the verify page (email + devCode via router state) instead of `/dashboard`.
- **Login.jsx** pre-fills email from router state, shows the verified banner, and renders a "Verify your email" link when `EMAIL_NOT_VERIFIED` is returned.

**E2E verified (through :5173 proxy):** register `201` (no Set-Cookie, devCode returned) → login `403 EMAIL_NOT_VERIFIED` → verify-email `200` → login `200 + Set-Cookie` → seeded demo accounts unaffected (`200 + Set-Cookie`).
**Also:** client lint 0, server lint 0, `vite build` ✅, client tests 24/24 ✅, server tests 20/20 ✅.

---

## Real email delivery for verification codes (Ethereal dev inbox + SMTP support)

**User report:** "can't receive verification code on my email" — the old dev mode only *logged* email content to the server terminal, so nothing ever reached a real inbox, and there was no way to re-request a code.

**Fixes:**

1. **`EmailService` rewritten with three delivery tiers** (first available wins, `send()` never hard-fails):
   - **`smtp`** — real delivery when `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are set in `server/.env` (Gmail app-password, Brevo, Mailtrap…).
   - **`ethereal`** — dev default (no credentials): a disposable Ethereal test account is auto-created, the mail is genuinely sent over SMTP, and a **preview URL** is returned/logged.
   - **`console`** — offline fallback, logs only.
2. **Preview URL surfaced in the UI:** register/resend responses now include `devEmailPreviewUrl` (dev only); the VerifyEmail page's dev banner shows the code **and** an "Open the emailed message (test inbox)" link.
3. **`POST /auth/resend-verification`** (new, rate-limited with the forgot-password limiter): re-issues a fresh hashed code (old one invalidated), `24h` expiry, generic response when the account doesn't exist / is already verified (no enumeration), `403` when blocked.
4. **VerifyEmail page upgraded:** "Resend code" button with a 30s cooldown (state recovered from Redux so it works after refresh), resend success banner, `inputMode="numeric"` code field, validator tightened to exactly 6 digits on both server (`/^\d{6}$/`) and client (zod regex).
5. **Registration email template** now shows a large 6-digit code block above the one-click verify button.
6. **`server/.env` created** (was missing — only `.env.example` existed): local Mongo, JWT secrets, mock payments, documented step-by-step Gmail app-password instructions for enabling real inbox delivery; `.env.example` updated likewise.
7. **Startup log** now prints the actual email mode instead of the stale "console email mode" line.

**E2E verified:** register `201` + `devVerificationCode` + `devEmailPreviewUrl` → unverified login `403` → resend returns a **rotated** code + new preview URL → verify with new code `200` → login `200` + auth cookies. Ethereal message preview URL confirmed in server log (`https://ethereal.email/message/…`).
**Validation:** lint 0 (both), `vite build` ✅, client tests 24/24 ✅, server tests 20/20 ✅.

**To get codes in a real Gmail inbox:** enable 2-Step Verification → create an App Password (https://myaccount.google.com/apppasswords) → fill `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` in `server/.env` → restart the server.

## 2026-08-30 — SMTP misconfiguration found & fixed during live run

A live run caught a real bug: `server/.env` had `SMTP_PASS=Wanderlust` (the account-style
password, 10 chars). Gmail rejects anything but a 16-char App Password with
`535 BadCredentials`, which **broke the register endpoint entirely** (500 on signup).

Fixes:
1. **EmailService is now resilient** — an SMTP send failure is caught and logged loudly
   (with a hint that Gmail needs a 16-char App Password), then delivery degrades to the
   Ethereal dev inbox. Signup/email-verify flows can no longer 500 because of SMTP.
2. `server/.env`: the invalid Gmail credentials were commented out with the reason and
   correct setup steps kept inline; active config is back to Ethereal dev mode.
3. Restart procedure note: `Stop-Process -Name node` kills BOTH servers — always restart
   Vite (root `node_modules\vite\bin\vite.js`, cwd `client/`) after the backend.

Re-run verified end-to-end through the :5173 proxy: register `201` + code + inbox link,
unverified login `403`, verify `200`, login `200`, demo account login `200`, and the

## 2026-08-30 — Real Gmail SMTP configured & verified end-to-end

The user supplied a 16-character Google App Password. Wired into `server/.env`:
```
SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
SMTP_USER=piyushmohojkar628@gmail.com  SMTP_PASS=<16-char app password>
EMAIL_FROM="Wanderlust <piyushmohojkar628@gmail.com>"
```

**Live proof (server log):**
```
[email:smtp] "Your new Wanderlust verification code" -> piyushmohojkar628@gmail.com
  (<f39dae7e-c46b-6a03-44f9-363c07e67028@gmail.com>)
```
→ Gmail's SMTP relay **accepted** the message (returned a real messageId). No
`SEND FAILED` line. The `resend-verification` response returned `200` in 3.7 s.

**Meaning:** every future signup now sends a genuine 6-digit verification code
to the user's real Gmail inbox. Check inbox (and the Promotions/Spam tab — the
email comes from `piyushmohojkar628@gmail.com` via Google's servers, so it is
authentic and should land in the primary tab once the first one is opened).

**To disable real delivery** (go back to the zero-dependency Ethereal preview
inbox): empty `SMTP_HOST`/`SMTP_PASS` in `server/.env` and restart. The
EmailService then uses Tier 2 automatically — nothing breaks either way.

**Final validation sweep (all green):**
- Server lint: 0 errors — EmailService, AuthService, authController ✅
- Client lint: 0 errors — authSlice, VerifyEmail, Register, authSchemas ✅
- `vite build`: built in 8.79 s ✅
- Client tests: 24/24 passed ✅
- Server tests: 20/20 passed ✅
- Live API: frontend 200 · backend 200 · `/api/hotels` proxy ✅

**Current auth flow:** Signup → `201` (no cookie, no auto-login) → Verify page
(dev banner still shows the code in non-production) → code lands in real Gmail →
enter code (or click the link in the email) → `200` → Login page → Login → auth
cookies + dashboard. Unverified login still returns `403 EMAIL_NOT_VERIFIED`.

Ethereal preview URL printed in the server log.

## 2026-08-30 — UI polish: kill side whitespace, split-screen auth pages

User feedback: pages left too much empty space on the left/right and looked flat.
Changes:

1. **New `client/src/components/auth/AuthLayout.jsx`** — full-height split screen for all
   auth routes. Left half is a branded decorative panel (Unsplash resort, brand-gradient
   overlay, logo, tagline, stat chips, guest testimonial); right half centers the form card.
   Mobile keeps the focused form (panel hides below `lg`).
2. **Rewired all 5 auth pages** onto `AuthLayout`: Login, Register, ForgotPassword,
   ResetPassword (both branches), VerifyEmail (both branches — auto-verify + code entry).
   The old flat `bg-sand-50 … min-h-[calc(100vh-8rem)]` wrappers are gone (`leftover=0`).
3. **Indentation cleanup** in the tails of `HotelList.jsx` and `Checkout.jsx` (stray deep
   closes from the earlier truncation repair — now aligned with their openers).
4. Earlier in this session the wide `container-page` (`max-w-screen-2xl`) plus
   `section-alt`/`section-wash` band helpers and section bands on Home / HotelList /
   HotelDetail / Checkout were added to remove dead side space on public pages.

**Validation (all green):**
- Client ESLint: 0 errors (auth pages + AuthLayout) ✅
- Server ESLint: 0 errors ✅
- `vite build`: built in 21.36 s ✅
- Client tests: 24/24 passed ✅
- Server tests: 20/20 passed ✅
- Live: frontend `http://localhost:5173/` 200 · backend `/api/health` 200 ✅

**Restart note for Vite on this machine:** the binary is hoisted to the repo root —
start with `node` + `WorkingDirectory=client` +
`c:\…\Wanderlust\node_modules\vite\bin\vite.js` (a plain `Start-Process` on the `.js`
file fails with "not a valid Win32 application", and `Stop-Process -Name node` kills
the backend too).
## 2026-08-30 — Full-bleed pages (no side gaps at all)

Follow-up: user still saw left/right gutters on wide monitors.

Cause: `container-page` still capped width at `max-w-screen-2xl` (1536px) — anything
wider left visible horizontal margins on both sides.

Fixes:
1. `client/src/index.css`: `.container-page` dropped `max-w-screen-2xl` →
   `@apply mx-auto w-full px-4 sm:px-6 lg:px-8;` — every page that uses it now fills
   the full viewport; only small responsive padding remains (no dead space).
2. `Home.jsx` property grids: added `2xl:grid-cols-5` so full-bleed ultra-wide screens
   show more columns instead of stretched cards.
3. `HotelList.jsx` results grid: added `2xl:grid-cols-4`.

**Validation:** client ESLint 0 errors ✅ · `vite build` 17.70 s ✅ · client tests
24/24 ✅ · live Vite HMR picks the CSS/JSX up automatically.
## 2026-08-30 — FIX: hotel card click → "Could not load hotel"

User: clicking any hotel card showed an error instead of the detail page.

Root cause: the public hotel detail API only worked by MongoDB `_id`, but every
hotel card links to `/hotels/{slug}` (`HotelCard` uses `hotel.slug || hotel._id`).
`searchController.getPublicHotel` computed a `findBy` object (id vs slug) but then
**ignored it** and always called `HotelService.getHotelById(identifier,…)` →
`Hotel.findById(slug)` threw a CastError → wrapped as `400 Invalid value for "_id"`
→ the client showed its `failed` ErrorState.

Fix (`server/src/controllers/searchController.js`):
- Detect 24-char hex object-ids with `/^[0-9a-fA-F]{24}$/`.
- Object id → `HotelService.getHotelById(identifier, { publicOnly: true })`.
- Anything else → `HotelService.getPublicHotelBySlug(identifier)` (method already
  existed but was never wired up).
- Removed the dead `findBy` computation.

Verified live after backend restart:
- `GET /api/search/hotels/the-coral-cove-resort` → **200** with hotel details
  (was 400 INVALID_ID).
- `GET /api/search/hotels/{24-hex-id}` → **200** (unchanged).
- Unknown slug → proper **404 NOT_FOUND**.
- Full browser path `:5173/api/search/hotels/{slug}` via Vite proxy → **200**;
  SPA route `/hotels/{slug}` serves the app.

Server ESLint: 0 errors ✅ · server tests: 20/20 ✅.
## 2026-08-30 — Hotel detail page: full redesign (UX + full-screen layout)

User: the hotel detail page (opened by clicking any hotel card) is not user-friendly,
poorly styled/aligned, and still wasted empty space on the left/right.

Rebuilt `client/src/pages/hotels/HotelDetail.jsx` as a professional OTA-style page:

1. **Full-bleed hero gallery** (no side margins — edge to edge):
   - Desktop: 5-image mosaic (`lg:[1.55fr_1fr]`, 540px tall): large main photo +
     2×2 thumbnail grid; placeholder tiles when fewer than 5 photos; "+N more"
     overlay on the last tile when the hotel has more photos.
   - Mobile: single large hero image.
   - Overlay card on the image: property-type badge, Featured badge, hotel name,
     location, rating pill (★ x.x · N reviews), star rating, wishlist "Save/Saved"
     button + "Book now" CTA.
   - "Show all photos" glass pill + full **lightbox** with prev/next arrows and
     keyboard navigation (Esc / ← / →).

2. **Sticky quick-summary bar** (below navbar): back-to-hotels link, compact hotel
   name + rating + city, "Starting from ₹X/night" and a "Check availability" CTA
   that smooth-scrolls to the booking widget.

3. **Structured content columns** (full-width grid, sticky right sidebar):
   - About card with quick-fact tiles (rating / room types / location).
   - Amenities with lucide icon mapping (wifi/pool/parking/spa/ac/…) — falls back
     to Sparkles for unknown amenities.
   - "Good to know": check-in/check-out, free-cancellation window, pet policy and
     house rules with Check icons.
   - **Rooms & rates**: 2-col room cards (photo, type badge, guests + bed icons,
     amenity pills, per-night & live N-night total, "Only X left"/"Sold out"
     badges) with a select-room flow; a live "Checking availability…" indicator.
   - **Guest reviews**: branded score panel (rating + stars) + review list.

4. **Sticky booking widget** (right): gradient price header, check-in/check-out
   date inputs (auto self-validating), guest dropdown, nights × rate summary,
   selected-room card with live total, big "Book now" CTA (disabled until a room
   is picked), trust badges (free cancellation · no prepayment), back link.
   On mobile, picking a room auto-scrolls to the widget.

**Validation:** client ESLint 0 errors ✅ · `vite build` ✅ (11.68 s) · client tests
24/24 ✅ · live API `/api/search/hotels/{slug}` → 200 (hotel + 3 rooms + 3 reviews
+ 3 images) · Vite (5173) + API (5000) both up.
## 2026-08-30 — FIX: "Choose a room first" button not clickable

User: on the hotel detail page, the "Choose a room first" button was dead — it
wouldn't respond to clicks.

Root cause: the booking widget's primary CTA rendered `disabled={!selectedRoom}` —
so until the user manually clicked a room card the button was disabled and
completely unresponsive.

Fix (`client/src/pages/hotels/HotelDetail.jsx`):
1. **Auto-select**: once availability resolves, the first available room is
   auto-selected (`useEffect` keyed on `detail?.rooms` + `availability` +
   `availabilityStatus`) — the CTA immediately becomes active "Book now" and the
   room card shows the "Selected" state.
2. **Always-clickable CTA**: the button is disabled only when the hotel has no
   rooms at all. `handleBookNow` resolves the room via `selectedRoom` → first
   available → first room, and books it. If there are truly no rooms, clicking
   smooth-scrolls to the rooms section and flashes a brand ring highlight
   (`scroll-mt-32` offsets the sticky navbar + summary bar).
3. The "Selected room" summary box also falls back to the resolved room so it
   always shows a live total before the user touches anything.

**Validation:** client ESLint 0 errors (0 warnings) ✅ · `vite build` ✅ (9.81 s) ·
client tests 24/24 ✅ · Vite (5173) + API (5000) live ✅.

---

## 2026-09-03 — Full Booking Flow E2E-Verified (Guest → Payment → Confirmation → My Bookings)

### Frontend flow completed (per master spec)
- **Checkout** (`/bookings/checkout`): guest details (name/email/phone per-room form),
  stay summary card, **coupon apply/remove** (server re-quote per change), sticky
  **Price details** sidebar (per-night × nights × rooms, service fee, GST, coupon
  discount, total payable) with hotel thumbnail + room name + "Change room/dates" link.
  Submit → creates booking → **auto-redirects to Payment** (`/bookings/pay/:id`).
- **PayNow / PaymentSection**: mock Razorpay modal simulation — methods (UPI / card /
  netbanking / wallet), processing state, success/fail branches, server
  `create-order` → `verify` (mock signature `mock_payment`) → confirmed.
- **BookingConfirmation** (`/bookings/confirmation/:id`): success hero, booking number,
  check-in code, payment status, CTA → My Bookings / hotel.
- **MyBookings** (dashboard): status filter tabs (all/upcoming/completed/cancelled —
  server-filtered), BookingCard grid, **BookingDetail** with cancel dialog
  (server refund % logic), invoice print view, review CTA for completed stays.

### 🔴 Two critical backend bugs found by live E2E — FIXED
1. **Every authenticated route returned 500** (`TokenService.isBlacklisted is not a
   function`): `authMiddleware.js` called `isBlacklisted` on the **exported class**
   instead of the `tokenService` instance. Fixed import + call site.
   *Symptom masked in UI tests because login worked and public search routes
   don't pass through the access-token check.*
2. **Payment verification always 500** (`paymentDoc.save is not a function`):
   `PaymentService.verifyPayment` loaded the Payment doc with `.lean()` (plain
   object, no Mongoose methods) and then called `.save()` on it. Removed `.lean()`.

### Live E2E proof (11/11 PASS, real HTTP against :5000)
login ✅ · search ✅ · detail+room ✅ · **create booking + WELCOME10 coupon**
(₹14,880 − ₹1,488 → ₹13,392, state pending/pending) ✅ · **create payment order**
(mock provider) ✅ · **verify payment → confirmed/paid**, method=mock, paidAt set ✅ ·
**pay-at-hotel → confirmed/pending**, check-in code issued ✅ · **cancel → refunded ₹14,880**
✅ · my-bookings filters confirmed/cancelled/completed ✅

**Validation:** server ESLint 0 errors ✅ · server tests 20/20 ✅ · client tests
24/24 ✅ · `vite build` ✅ · backend restarted clean (Mongo + mock payments up) ✅.

---

## 2026-09-03 — Email Verification Disabled + Owner Account Created

### Email verification removed from the login flow (temporary)
- **Server:** `AuthService.login` no longer rejects unverified accounts
  (`EMAIL_NOT_VERIFIED` guard removed). `AuthService.register` now creates
  accounts with `isVerified: true` and **no verification email is sent**.
- **Client:** `Register.jsx` redirects straight to `/auth/login`
  (state `{ email, created: true }`); `Login.jsx` shows a green
  "Account created successfully!" banner on arrival. Email prefill still works.
- The `/auth/verify-email` + `/resend-verification` endpoints and the
  `VerifyEmail` page remain functional for backward compatibility, but they
  are no longer part of the signup → login journey.

### Owner account provisioned
- **`piyushmohojkaer2003@gmail.com` / `Piyush@123`** — role `owner`,
  `isVerified: true` (created via one-off script against the live DB; script removed).
- Verified via live API: `POST /api/auth/login` → 200, `role=owner`.

### Seeded demo accounts (for reference)
| Role | Email | Password |
|---|---|---|
| admin | `admin@wanderlust.dev` | `password123` |
| owner (demo) | `owner@wanderlust.dev` | `password123` |
| customer | `guest@wanderlust.dev` | `password123` |

### Live API proof
```
OWNER  login piyushmohojkaer2003@gmail.com → 200 role=owner verified=true
ADMIN  login admin@wanderlust.dev          → 200 role=admin
REGISTER fresh user                        → 201 (no verification email, no devCode)
LOGIN    immediately after register        → 200 (no verification step)
```

**Validation:** server ESLint 0 errors (changed files) ✅ · server tests 20/20 ✅ ·
client ESLint 0 errors ✅ · client tests 24/24 ✅ · `vite build` ✅ (10.96 s) ·
backend restarted clean ✅.

---

## 2026-09-03 — ALL OUTGOING EMAIL TEMPORARILY DISABLED (user request)

Everything the app could ever email is routed through one choke point:
`server/src/services/EmailService.js → send()`. A single kill-switch there
(`const EMAILS_DISABLED = true`, top of file) now short-circuits **every**
message: it logs `[email:disabled] Suppressed "<subject>" → <to>` on the server
and returns `{ skipped: true }`. No transporter is ever created, no SMTP
connection is ever made — nothing can reach any inbox, including the Gmail app
password configured earlier in `server/.env` (left in place, inert).

**Suppressed email types (all call sites verified):** email verification codes &
resend, password-reset links, booking pending/confirmed/cancelled notices,
payment confirmations, property approval/rejection notices, check-in reminders
(`server/src/jobs/index.js`), review requests (`server/src/jobs/index.js`).

**Flow changes that came with it:**
- Register → 201 with message "Account created successfully. Log in to continue."
  New accounts are created `isVerified: true`; **no verification email is sent**
  and the response contains no code.
- Login has no verification gate (the earlier `EMAIL_NOT_VERIFIED` 403 is gone).
- Client: `/auth/verify-email` route and its import were removed from
  `AppRoutes.jsx`; Register redirects straight to Login with a success banner;
  Login no longer shows any "check your inbox" UI. In-app notifications (bell
  icon) are NOT email and remain fully functional.

**Kept dormant for easy re-enable (do not delete):** `pages/auth/VerifyEmail.jsx`
(unrouted), `verifyEmail`/`resendVerification` thunks + `devVerificationCode`
state in `authSlice.js`, `authRoutes` verify/resend endpoints, all email
templates, and the 3-tier send logic in `EmailService.js`.

**Known consequence:** "Forgot password" can no longer deliver reset links, so
self-service password reset is unavailable until email is re-enabled.

**To re-enable later:** in `EmailService.js` set `EMAILS_DISABLED = false`, then
either configure `SMTP_HOST/SMTP_USER/SMTP_PASS` in `server/.env` for real
delivery (Gmail needs a 16-char App Password) or leave them empty for the
disposable Ethereal dev inbox. Re-add the VerifyEmail route in `AppRoutes.jsx`
and re-insert the register→verify→login flow when the user specifies where.

**Live E2E proof (fresh user, real API):**
```
REGISTER  201  message="Account created successfully. Log in to continue."  no code, no email
LOGIN     200  immediately after register (no verification step)
OWNER     200  piyushmohojkaer2003@gmail.com / Piyush@123  → role=owner
ADMIN     200  admin@wanderlust.dev / password123            → role=admin
BOOKING   201  WL-20260903-AE0B702A  (booking pipeline intact without email)
```

**Validation:** server ESLint 0 errors ✅ · server tests 20/20 ✅ ·
client ESLint 0 errors ✅ · client tests 24/24 ✅ · `vite build` ✅ (7.83 s) ·
temp test script removed ✅.

---

## 2026-09-03 — OWNER PRICE/ROOM UI + PROPERTY VISIBILITY FLOW (fixed)

**Why "Piyush Hotel" wasn't listed publicly:** (1) new properties are created
`pending` and every public surface (search, collections, detail, booking,
wishlist) filters `status: 'approved'` — admin approval is required; (2) the
property had zero rooms (hence "FROM ₹0") and the owner UI had no way to add
rooms or set prices (documented gap: "Owner room management UI not built yet").

**Built (all client-side unless noted):**
- **`OwnerPropertyForm.jsx`** — new "Rooms & pricing" section (create mode):
  room name, type, **price per night**, total units, adults/children, bed type.
  On submit: `POST /hotels` → first room via `POST /hotels/:id/rooms` → redirect
  to the property detail page. Price left empty ⇒ skip (add rooms later).
  - Field-level server errors now surface: new `getApiErrorDetails()` helper in
    `apiClient.js`; failing fields get inline red errors via `Field.jsx`
    `error` prop + a details list in the banner (fixes the opaque
    "Please fix the highlighted fields" report).
  - Client validation mirrors server rules (name 3–140, tagline ≤160,
    description 20–5000, city 2–80, address 3–300, image URLs `new URL()`-valid,
    room price ≥1, units 1–1000, adults 1–16, children 0–8).
- **`OwnerPropertyDetail.jsx`** — full room management: rooms table (name, type,
  ₹/night, capacity, units, active/inactive badge), Add/Edit room modal,
  Activate/Deactivate toggle, soft-delete confirm (`DELETE /rooms/:id` keeps
  bookings intact). Data now from `GET /owner/properties/:id` (`{hotel, rooms}`).
  - Status banner (pending/rejected+reason/approved/suspended) + **"Submit for
    approval"** button → `POST /hotels/:id/submit` (route existed, was unused).
    "View public page" link only when approved.
- **Server `HotelService.listByOwner`** — attaches `minPrice` + `roomCount` per
  property (Room aggregation over active rooms) so the owner list shows real
  "from" prices and room counts instead of ₹0.
- **`OwnerProperties.jsx`** — room count shown under each property name.

**Piyush Hotel is now LIVE:** admin approved it + added "Deluxe Room ₹2,500"
(4 units, 2+1 guests, king bed). Verified: hidden before approval → listed
after (`minPrice=2500`), public detail returns the room. Note: this property
belongs to **`piyushmohojkar2003@gmail.com`** (the account the user actually
used), NOT the older `piyushmohojkaer2003@gmail.com` owner account (0
properties). Room was created via the admin account (authorized for rooms).

**Validation:** server ESLint 0 errors ✅ · server tests 20/20 ✅ · client
ESLint clean ✅ · client tests 24/24 ✅ · `vite build` ✅ (10.27 s) · live E2E:
room 201, bad-room 400 + field details, approve 200, public listing shows
Piyush Hotel @ ₹2500 ✅ · backend restarted with `node --watch src/server.js`
(entry file is `src/server.js`, not `src/index.js`) ✅ · temp E2E script
removed ✅.

---

## 2026-09-03 — FIX: "Cancel booking" silently failing on empty reason

**Root cause:** `cancelBookingValidator` used `body('reason').optional()
...isLength({ min: 3 })` — express-validator's default `optional()` only skips
`undefined`, so the **empty string** the UI sent (user leaves the reason box
blank) failed `min: 3` → 400 VALIDATION_ERROR. Both `MyBookings.jsx` and
`BookingDetail.jsx` then hid the failure: dispatch without `unwrap()`/`.then()`
runs even on rejection and closed the modal anyway, so cancel looked like a
no-op. Reproduced live: `PATCH /bookings/:id/cancel { reason: '' }` → 400.

**Fixes:**
- `bookingValidator.js` — `reason` now `.optional({ values: 'falsy' })` so an
  empty/omitted reason is accepted; a typed reason still needs 3–1000 chars.
- `MyBookings.jsx` + `BookingDetail.jsx` — `confirmCancel` uses
  `dispatch(...).unwrap()` in try/catch, sends `reason.trim() || undefined`,
  keeps the modal open and shows a red error banner on failure instead of
  silently closing.

**Verified live (fresh user → booked Piyush Hotel → cancel):**
`reason: ''` → **200 Booking cancelled** (was 400) · cancelling an
already-cancelled booking → 409 "Booking is already cancelled" (correct guard).
Server ESLint 0 errors · tests 20/20 · client ESLint clean · tests 24/24 ·
`vite build` ✅ · temp E2E script removed ✅.

---

## 2026-09-03 — NAVBAR REDESIGN (bigger + attractive) & NOTIFICATION BELL

**Navbar (`Navbar.jsx`, `MobileMenu.jsx`, `DashboardLayout.jsx`):** height
64px → 80px everywhere; logo icon 44px + `text-2xl` wordmark with hover
rotate/scale; center links are large rounded pills with lucide icons
(House/Building2/Star) — active state is the brand gradient with glow;
Log in is a bordered pill, Sign up a gradient pill with hover lift; user
dropdown enlarged (w-60, per-item icons, click-outside-to-close backdrop);
unread badge moved off the avatar to the new bell; mobile menu matches
(bigger text, icons, rounded-xl). Dashboard sidebar logo row + content header
bumped to h-20 for consistency.

**Notification bell (authenticated users, right side):** dedicated
`Bell` link → `/dashboard/notifications`, 44px circular button matching the
avatar pill, red unread badge (99+ cap) with a ping animation while unread > 0.

**Bug fixed along the way:** `fetchUnreadCount` read `data?.count` but the
server returns `{ data: { unread } }` — the unread count was therefore always
0 client-side (badge never showed). Thunk now reads `data?.unread`.
`App.jsx` also refreshes the count every 60s while authenticated.

**Verified live:** fresh user → booking → cancel →
`GET /notifications/unread-count` → `{ unread: 2 }` (booking + cancellation
notifications). Client ESLint clean · tests 24/24 · `vite build` ✅ ·
temp E2E script removed ✅.

**Navbar in dashboard/owner/admin too:** `DashboardLayout` now renders the
shared `<Navbar />` at the top (logo, center links, bell, avatar dropdown with
notifications) so the bell + global nav exist on every dashboard page. The
sidebar lost its redundant logo row and sticks below the navbar
(`top-20`, `h-[calc(100vh-5rem)]`); the page-title header is a slim static bar
(name/logout removed — both live in the navbar now). Mobile section pills
kept. Lint clean · tests 24/24 · build ✅.

---

## 2026-09-04 — REVIEWS & COMMENTS FEATURE (user-facing rating UI)

Server review system already existed (create/update/delete + owner replies +
moderation + per-hotel rating recalc) but **no client UI could create a
review**. Built the missing pieces:

- **`ReviewForm.jsx` (new)** — interactive 1–5 star picker (hover labels
  Terrible→Excellent), optional title (≤160), comment (10–3000 chars + live
  counter), stay selector when multiple eligible bookings exist. Create mode
  `POST /reviews {hotelId, bookingId, rating, title, comment}`; edit mode
  `PUT /reviews/:id`. Field-level server errors surfaced via
  `getApiErrorDetails`.
- **`HotelDetail.jsx`** — "Rate your stay" card inside Guest reviews when the
  logged-in user has an eligible stay at this hotel (booking confirmed/
  completed + checkout past + not already reviewed — mirrors the server's
  `assertEligible` rules, computed from `/bookings/my` + `/reviews/my`).
  Submitting refreshes the hotel detail (new rating + review appear instantly).
- **`MyReviews.jsx`** — Edit (modal, prefilled ReviewForm) + Delete (confirm
  modal → `DELETE /reviews/:id`, hotel rating recalculated) + hotel name link
  on each card + reviewer name shown.
- **`BookingDetail.jsx`** — "Rate your stay" button on finished stays
  (confirmed/completed + checkout past) opening the ReviewForm in a modal;
  shows a "Reviewed ✓" chip after submitting.

**Review rules (server-enforced):** only the booking's owner can review;
booking must be confirmed/completed; checkout must be in the past; one review
per booking (409 otherwise); comment 10–3000 chars; rating 1–5. Hotel
`rating`/`reviewCount` recalculate on create/edit/delete.

**Live E2E (12 steps, all passed):** register → book Piyush Hotel →
pay-at-hotel confirm → seed past checkout (createBooking rejects past dates
with PAST_DATES) → short comment 400 with field details → create review 201 →
duplicate 409 → my-reviews 1 → hotel rating 5.0/reviewCount 1 + review in
public list → edit to 4★ 200 → rating recalculated 4 → delete 200 → rating
recalculated 0. Client ESLint clean · tests 24/24 · build ✅ · temp scripts
removed ✅. Seeded the user's real booking WL-20260903-FE154731 (was cancelled
during cancel-testing) back to confirmed with past checkout so the form shows
up for them on the Piyush Hotel page.

