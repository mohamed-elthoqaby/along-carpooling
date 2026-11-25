# IMPLEMENTATION_PHASES.md — Step-by-Step Execution Plan

Follow these phases in order. Do not skip ahead. Mark checkboxes as tasks are completed.

---

## Phase 1: Project Setup & Database Foundation
**Goal:** Initialize Next.js + TypeScript + Tailwind + Prisma + PostgreSQL and seed sample data.
- [ ] Initialize Next.js (App Router, TypeScript, Tailwind CSS, `src/` directory).
- [ ] Install core dependencies: `prisma`, `@prisma/client`, `h3-js`, `zod`, `bcryptjs`, `jose`, `leaflet`, `react-leaflet`, `lucide-react`.
- [ ] Install dev dependencies: `@types/bcryptjs`, `@types/leaflet`, `vitest`, `@vitejs/plugin-react`.
- [ ] Configure `prisma/schema.prisma` with `User`, `Car`, `Ride` (with `@@index([originH3Index])`), `Booking`, and `Review`.
- [ ] Run initial migration (`npx prisma migrate dev --name init`).
- [ ] Create `src/lib/prisma.ts` (singleton) and `src/lib/h3.ts` (with `H3_RESOLUTION = 7`, `getH3Index`, `getNearbyH3Cells`, `getHexagonBoundary`).
- [ ] Create `prisma/seed.ts` with 1 Admin, 2 Drivers (with Cars), 2 Passengers, and 5 sample Rides around Egypt (e.g., Zagazig, Cairo, Obour City) with computed H3 indexes.
- [ ] **Done Criteria:** `npx prisma db seed` succeeds and data is visible in Prisma Studio.

---

## Phase 2: Authentication & Role-Based Access
**Goal:** Working Register, Login, Logout, and protected routes for Driver, Passenger, and Admin.
- [ ] Create `src/lib/auth.ts` (password hashing/verification, JWT sign/verify with `jose`, `getCurrentUser()` from cookies).
- [ ] Create API routes:
  - `POST /api/auth/register` (allows `DRIVER` or `PASSENGER`; blocks duplicate emails).
  - `POST /api/auth/login` (rejects invalid credentials or `isBanned === true`).
  - `POST /api/auth/logout` (clears cookie).
  - `GET /api/auth/me` (returns current user profile + car if driver).
- [ ] Create simple UI pages: `/login`, `/register`, and a shared `Navbar` showing role-appropriate links.
- [ ] Create Driver Car Setup form/API (`POST /api/cars` / `GET /api/cars/me`) so drivers can save their car info.
- [ ] **Done Criteria:** Can register as Driver or Passenger, log in, persist session on refresh, and log out.

---

## Phase 3: Ride Management & Interactive Map (Driver Side)
**Goal:** Drivers can create, view, complete, and cancel rides using a Leaflet map + H3 indexing.
- [ ] Create reusable client-only Leaflet map component `src/components/map/RideMap.tsx` (dynamic import `{ ssr: false }`).
- [ ] Create `src/services/ride.service.ts`:
  - `createRide(driverId, data)` -> validates seats > 0, price >= 0, computes `originH3Index` using `h3.ts`.
  - `updateRideStatus(rideId, driverId, status)` -> allows `COMPLETED` or `CANCELLED`.
  - `getDriverRides(driverId)`.
- [ ] Create API routes:
  - `POST /api/rides` (Driver only)
  - `GET /api/rides/my-rides` (Driver only)
  - `PATCH /api/rides/[id]` (Driver only — mark completed/cancelled)
  - `GET /api/rides/[id]` (Public/Auth — ride details + driver info + car + average rating)
- [ ] Build Driver Dashboard (`/dashboard`) and Create Ride page (`/rides/create`) where clicking the map sets Origin and Destination markers.
- [ ] **Done Criteria:** Driver creates a ride by clicking the map; `originH3Index` is stored in PostgreSQL.

---

## Phase 4: Uber H3 Nearby Discovery & Booking Workflow (Passenger + Driver)
**Goal:** Passengers discover nearby rides via H3 hexagons on the map and book seats; Drivers accept/reject.
- [ ] Add `findNearbyRides({ lat, lng, ringSize, destinationQuery, date })` to `src/services/ride.service.ts`:
  - Uses `gridDisk(userCell, ringSize)` to query PostgreSQL `originH3Index IN (...)`.
  - Returns `{ rides, searchHexagons }` where `searchHexagons` contains polygon coordinates from `cellToBoundary`.
- [ ] Create `GET /api/rides/nearby?lat=...&lng=...&k=1&dest=...` endpoint.
- [ ] Build Explore / Nearby Rides page (`/rides/explore`):
  - Interactive Leaflet map where Passenger clicks their location (or uses "My Location").
  - Dropdown to switch H3 Ring Radius (`k = 0`, `k = 1`, `k = 2`).
  - Renders the H3 hexagons as semi-transparent polygons on the map + markers for matching rides.
- [ ] Create `src/services/booking.service.ts`:
  - `requestBooking(passengerId, rideId, seatsRequested)` -> checks ride is `OPEN`, passenger is not the driver, and `availableSeats >= seatsRequested`.
  - `respondToBooking(driverId, bookingId, action: 'CONFIRMED' | 'REJECTED')` -> uses `prisma.$transaction` to atomically decrement `availableSeats` on `CONFIRMED` (preventing negative seats).
  - `cancelBooking(passengerId, bookingId)` -> if previously `CONFIRMED`, restores `availableSeats` inside a transaction.
- [ ] Create API routes for bookings (`/api/bookings`, `/api/bookings/[id]`, `/api/bookings/my-bookings`) and wire them into Passenger & Driver dashboards.
- [ ] **Done Criteria:** Full end-to-end flow works: Driver creates ride -> Passenger sees H3 hexagons & ride on map -> Books seat -> Driver accepts -> Available seats decrement accurately.

---

## Phase 5: Reviews & Minimal Admin Panel
**Goal:** Complete remaining course requirements cleanly.
- [ ] Create `src/services/review.service.ts`:
  - `createReview(passengerId, rideId, rating, comment)` -> verifies passenger had a `CONFIRMED` booking, ride is `COMPLETED`, rating is 1–5, and no duplicate review exists.
- [ ] Create `POST /api/reviews` and display driver average rating + reviews on ride details.
- [ ] Create Admin API routes (strictly `ADMIN` role only):
  - `GET /api/admin/stats` (counts of users, rides, bookings)
  - `GET /api/admin/users` & `PATCH /api/admin/users/[id]` (toggle `isBanned`)
  - `GET /api/admin/rides` & `DELETE /api/admin/rides/[id]`
- [ ] Build `/admin` page with 3 simple tabs: Overview Stats, Users Table (Ban/Unban), Rides Table (Delete).
- [ ] **Done Criteria:** Passenger can rate a completed ride; Admin can ban a user and delete a ride.

---

## Phase 6: Automated Testing & Final Verification
**Goal:** Satisfy the Software Testing course with automated tests and clean documentation.
- [ ] Configure `vitest.config.ts` and `"test": "vitest run"` in `package.json`.
- [ ] Implement all unit tests listed in `TESTING_PLAN.md`:
  - `src/__tests__/h3.test.ts` (H3 indexing, `gridDisk` ring counts: k=0 -> 1, k=1 -> 7, k=2 -> 19, boundary polygons).
  - `src/__tests__/booking.service.test.ts` (seat decrement, overbooking prevention, cancellation restores seats, driver self-booking blocked).
  - `src/__tests__/ride.service.test.ts` (validation errors, H3 index assignment).
  - `src/__tests__/review.service.test.ts` (rating range 1–5, only completed rides allowed).
- [ ] Run full test suite (`npm test`) and verify 100% pass rate.
- [ ] Perform manual smoke test of all 3 roles (Driver, Passenger, Admin) and verify zero console errors.
- [ ] **Done Criteria:** All tests pass, `npm run build` succeeds cleanly.