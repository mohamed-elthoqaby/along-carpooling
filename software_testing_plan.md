# TESTING_PLAN.md — Software Verification & Testing Plan

This document fulfills the **Software Testing / Verification** course requirements by defining our testing strategy, automated test suites, and Requirement Traceability Matrix (RTM).

---

## 1. Testing Strategy
We use a practical 3-layer verification approach:
1. **Unit Testing (Automated — Vitest):** Tests pure helper functions (`src/lib/h3.ts`) and core business rules (`src/services/*.ts` with mocked Prisma client) in isolation. Fast, deterministic, and covers edge cases.
2. **API / Integration Testing (Manual via Postman / Thunder Client or Vitest):** Verifies HTTP status codes, Zod input validation, JWT authentication, and real PostgreSQL transactions.
3. **System / Acceptance Testing (Manual Walkthrough):** End-to-end verification of the UI, Leaflet map rendering, H3 hexagon overlays, and role-based workflows.

---

## 2. Requirement Traceability Matrix (RTM)

| Req ID | Requirement Summary | Test Case IDs | Test Type |
| :--- | :--- | :--- | :--- |
| **FR-01** | User Registration & Login | TC-01, TC-02, TC-03 | Integration / Manual |
| **FR-03** | Create Ride with H3 Index | TC-04, TC-05 | Unit + Integration |
| **FR-04** | H3 Nearby Ride Discovery | TC-06, TC-07, TC-08 | Unit + System |
| **FR-05** | Passenger Booking Request | TC-09, TC-10, TC-11 | Unit + Integration |
| **FR-06/07** | Accept/Reject & Atomic Seats | TC-12, TC-13, TC-14 | Unit + Integration |
| **FR-09** | Driver Rating & Reviews | TC-15, TC-16 | Unit + Manual |
| **FR-10** | Admin Ban User & Delete Ride | TC-17, TC-18 | Integration / Manual |

---

## 3. Detailed Test Cases

### A. Authentication (FR-01)
- **TC-01 — Valid Login:**
  - *Input:* Registered email & correct password.
  - *Expected:* HTTP `200`, HTTP-only JWT cookie set, user redirected to role dashboard.
- **TC-02 — Invalid Credentials:**
  - *Input:* Valid email + wrong password.
  - *Expected:* HTTP `401`, error message `"Invalid email or password"`.
- **TC-03 — Banned User Login:**
  - *Input:* Credentials of a user with `isBanned = true`.
  - *Expected:* HTTP `403`, error message `"Account is banned"`.

### B. Ride Creation & Uber H3 Logic (FR-03, FR-04) — *Automated in `h3.test.ts` & `ride.service.test.ts`*
- **TC-04 — Create Ride Computes Valid H3 Index:**
  - *Input:* Origin `(30.5877, 31.5020)` (Zagazig), seats = `3`, price = `150`.
  - *Expected:* Ride saved with valid Resolution-7 `originH3Index` string and `availableSeats = 3`.
- **TC-05 — Reject Invalid Ride Inputs:**
  - *Input:* `totalSeats = 0` or `price = -10`.
  - *Expected:* Validation error thrown; ride is not created.
- **TC-06 — H3 Ring Size Cell Count Verification:**
  - *Input:* Any valid `(lat, lng)` with `k = 0`, `k = 1`, `k = 2`.
  - *Expected:* `getNearbyH3Cells` returns exactly `1`, `7`, and `19` unique H3 cell IDs respectively.
- **TC-07 — Nearby Ride Found in Neighboring Hexagon:**
  - *Input:* Ride created ~2 km away from passenger's point; passenger searches with `k = 1`.
  - *Expected:* Ride's `originH3Index` is included in `gridDisk(passengerCell, 1)` -> Ride appears in results.
- **TC-08 — Distant Ride Excluded:**
  - *Input:* Ride created in Alexandria (~200 km away); passenger in Zagazig searches with `k = 2`.
  - *Expected:* Ride is NOT returned in nearby results.

### C. Booking & Seat Integrity (FR-05, FR-06, FR-07) — *Automated in `booking.service.test.ts`*
- **TC-09 — Successful Booking Request:**
  - *Input:* Passenger requests `1` seat on an `OPEN` ride with `3` available seats.
  - *Expected:* Booking created with status `PENDING`.
- **TC-10 — Booking When No Seats Available (Boundary Case):**
  - *Input:* Passenger requests `1` seat when `availableSeats = 0` (or requests `3` seats when `availableSeats = 2`).
  - *Expected:* Error `"Not enough available seats"`; booking rejected.
- **TC-11 — Driver Cannot Book Own Ride:**
  - *Input:* `passengerId === ride.driverId`.
  - *Expected:* Error `"Drivers cannot book their own rides"`.
- **TC-12 — Driver Accepts Booking (Seat Decrement):**
  - *Input:* Driver accepts a `PENDING` booking for `1` seat on a ride with `3` seats.
  - *Expected:* Booking status becomes `CONFIRMED`; ride `availableSeats` updates `3 -> 2` atomically.
- **TC-13 — Driver Rejects Booking:**
  - *Input:* Driver rejects a `PENDING` booking.
  - *Expected:* Booking status becomes `REJECTED`; `availableSeats` remains unchanged.
- **TC-14 — Passenger Cancels Confirmed Booking (Seat Restoration):**
  - *Input:* Passenger cancels a `CONFIRMED` booking of `1` seat on a ride with `2` seats.
  - *Expected:* Booking status becomes `CANCELLED`; ride `availableSeats` updates `2 -> 3`.

### D. Reviews (FR-09) — *Automated in `review.service.test.ts`*
- **TC-15 — Valid Review After Ride Completion:**
  - *Input:* Confirmed passenger submits `rating = 5`, `comment = "Great driver"` on a `COMPLETED` ride.
  - *Expected:* Review saved successfully.
- **TC-16 — Prevent Review on Uncompleted Ride or Out-of-Range Rating:**
  - *Input:* Ride status is `OPEN`, OR `rating = 6`.
  - *Expected:* Error thrown; review is not saved.

### E. Admin Controls (FR-10)
- **TC-17 — Admin Bans User:**
  - *Input:* Admin toggles ban on a Passenger.
  - *Expected:* User's `isBanned` becomes `true`; subsequent login attempts fail (links to TC-03).
- **TC-18 — Non-Admin Access Blocked:**
  - *Input:* Passenger or Driver calls `GET /api/admin/stats`.
  - *Expected:* HTTP `403 Forbidden`.

---

## 4. Running Automated Tests
```bash
# Run all unit tests once
npm test

# Run tests in watch mode during development
npx vitest
```