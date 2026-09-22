# Wanderlust — Hotel Booking & Management System

A production-quality MERN hotel booking platform: guest-facing search & booking, owner property management, and a full admin console (users, hotels, bookings, payments, reviews, coupons, reports, audit logs).

## Tech stack

- **Frontend:** React 19 + Vite + Redux Toolkit + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT access/refresh tokens (httpOnly cookies), role-based access (admin / owner / customer)
- **Payments:** Razorpay (auto-falls back to a mock provider when keys are absent)
- **Email:** Gmail SMTP (auto-falls back to a test inbox when not configured)

## Quick start (local)

```bash
npm install            # installs server + client workspaces
npm run seed           # wipes & seeds the dev database (demo users, 20 hotels, rooms, bookings, coupons)
npm run dev            # server on :5000 + Vite dev server on :5173
```

The client proxies `/api` to `http://localhost:5000` in development.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin123@gmail.com` | `Admin@123` |
| Owner (×10) | `owner@wanderlust.dev`, `meera.owner@wanderlust.dev`, `vikram.owner@wanderlust.dev`, `ananya.owner@wanderlust.dev`, `rahul.owner@wanderlust.dev`, `ishita.owner@wanderlust.dev`, `arjun.owner@wanderlust.dev`, `neha.owner@wanderlust.dev`, `dev.owner@wanderlust.dev`, `riya.owner@wanderlust.dev` | `password123` |
| Customer | `guest@wanderlust.dev` | `password123` |

The seed creates **20 approved hotels across 10 owners** (2 each) with room types, bookings, reviews and coupons — so a fresh deployment is instantly demo-ready with no manual setup.

## Deployment (single service — Render / Railway / any Node host)

The server serves the built client in production, so one web service runs the whole app.

1. **MongoDB:** create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and copy the connection string.
2. **Create the web service** with:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run seed && npm start`  *(seeds the demo data once on first boot — or run it manually from the shell afterwards)*
3. **Environment variables** (see `.env.example` for the full annotated list):

| Variable | Example / notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render injects its own) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster/wanderlust` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random strings (**required in production**) |
| `CLIENT_URL` / `FRONTEND_URL` | `https://your-app.onrender.com` |
| `SERVER_URL` | `https://your-app.onrender.com` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | optional — mock payments if empty |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | optional — test inbox if empty |
| `CLOUDINARY_*` | optional — local `/uploads` fallback if empty |

4. `CLIENT_URL` is also the CORS allow-list; if you host the client separately (e.g. Vercel), set `VITE_API_URL=https://your-api.example.com/api` in the client env and add that origin to `CLIENT_URL`.

**Split deploys:** the API lives at `/api/*`; anything else serves the SPA.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server (:5000) + Vite (:5173) with hot reload |
| `npm run build` | production build of the client (`client/dist`) |
| `npm start` | production server (serves API + built client) |
| `npm run seed` | reset & reseed demo data |
| `npm test` | server + client test suites |
| `npm run lint` | ESLint for server + client |

## Project layout

```
client/   React SPA (Vite, Redux Toolkit, Tailwind)
server/   Express API (Mongoose, JWT auth, Razorpay, Nodemailer, cron jobs)
```
