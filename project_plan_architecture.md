# PROJECT_PLAN.md — Carpooling / Ride-Sharing System

## 1. Idea Review & Scope Simplification
The original idea is strong and covers Web Development, Software Engineering, and Software Testing. To keep the project realistic, clean, and easy to defend without unnecessary complexity, we apply the following scope decisions:

### What We Keep (Core Value)
- **3 Actors:** Driver, Passenger, Admin.
- **Full Ride Lifecycle:** Create Ride -> Search/Discover Nearby -> Request Booking -> Driver Accept/Reject -> Complete Ride -> Rate Driver.
- **Interactive Map + Uber H3 (`h3-js`):** Drivers pick pickup/drop-off points on a map; Passengers discover nearby rides using Uber's hexagonal grid (`gridDisk`) with visual hexagon overlays on the map.
- **Atomic Seat Management:** Confirming a booking automatically decrements available seats; cancelling a confirmed booking restores seats.
- **Automated Testing:** Unit & integration tests mapped directly to Functional Requirements.

### What We Simplify / Trim (To Avoid Over-Engineering)
- **Smart AI Matching (% Score):** Replaced by **Uber H3 Nearby Discovery** (exact & neighboring hexagons) + simple filters (destination text, date, max price). This is more impressive technically and much cleaner to explain.
- **Admin Reports System:** Simplified to **Manage Users (Ban/Unban)**, **Manage Rides (Delete)**, and **Basic Dashboard Statistics** (total users, rides, bookings).
- **Online Payments:** Out of scope (cash on ride; price is informational).
- **Live GPS Tracking / Chat:** Out of scope (static pickup/drop-off coordinates + driver phone number shown after booking is confirmed).

---

## 2. Software Engineering Specification

### 2.1 Problem Statement
- **Problem:** Commuters traveling between the same locations often drive separate vehicles with empty seats, increasing transportation costs, fuel consumption, and traffic congestion.
- **Solution:** A web-based carpooling platform that connects drivers with empty seats to nearby passengers using Uber's H3 spatial indexing for fast, location-based ride discovery.

### 2.2 Functional Requirements (FR)
- **FR-01 (Auth):** Users shall be able to register (as Driver or Passenger), log in, and log out securely.
- **FR-02 (Car Profile):** Drivers shall be able to register their car details (brand, model, color, plate number).
- **FR-03 (Create Ride):** Drivers shall be able to create a ride by selecting origin/destination on a map, date/time, available seats, and price per seat. The system shall automatically compute and store the origin's H3 cell index.
- **FR-04 (H3 Nearby Discovery):** Passengers shall be able to pick their location on the map and discover available rides within their H3 hexagon and neighboring rings (`k = 1` or `k = 2`), with optional filters (destination, date).
- **FR-05 (Request Booking):** Passengers shall be able to request 1 or more seats on an active ride with sufficient available seats.
- **FR-06 (Manage Bookings):** Drivers shall be able to accept or reject pending booking requests for their rides.
- **FR-07 (Seat Synchronization):** When a driver accepts a booking, the system shall atomically decrease `availableSeats`. If a confirmed booking is cancelled, the seats shall be restored.
- **FR-08 (Complete / Cancel Ride):** Drivers shall be able to mark a ride as `COMPLETED` or `CANCELLED`.
- **FR-09 (Rating & Reviews):** Passengers with a `CONFIRMED` booking on a `COMPLETED` ride shall be able to rate the driver (1–5 stars) and leave a comment.
- **FR-10 (Admin Management):** Admins shall be able to view system statistics, ban/unban users, and delete inappropriate rides.

### 2.3 Non-Functional Requirements (NFR)
- **NFR-01 (Security):** Passwords must be hashed using `bcryptjs`; sessions managed via HTTP-only signed JWTs; banned users cannot log in or perform actions.
- **NFR-02 (Performance):** H3 nearby ride queries use an indexed `originH3Index` column in PostgreSQL, responding in under 500ms for typical datasets.
- **NFR-03 (Data Integrity):** Seat updates during booking approval must execute inside a PostgreSQL transaction to prevent overbooking.
- **NFR-04 (Usability):** Clean responsive UI with visual map feedback (markers + H3 hexagon polygons).
- **NFR-05 (Testability):** Core business logic is decoupled from HTTP handlers to achieve high unit test coverage.

---

## 3. Database Schema (PostgreSQL + Prisma)

### Tables & Relationships
1. **`User`**: `id`, `name`, `email` (unique), `passwordHash`, `phone`, `role` (`DRIVER` | `PASSENGER` | `ADMIN`), `isBanned` (boolean, default false), `createdAt`.
2. **`Car`**: `id`, `driverId` (unique FK -> `User`), `brand`, `model`, `color`, `plateNumber`.
3. **`Ride`**:
   - `id`, `driverId` (FK -> `User`)
   - `originName`, `originLat` (Float), `originLng` (Float), **`originH3Index` (String, indexed!)**
   - `destName`, `destLat` (Float), `destLng` (Float)
   - `departureTime` (DateTime)
   - `totalSeats` (Int), `availableSeats` (Int), `price` (Float)
   - `status` (`OPEN` | `COMPLETED` | `CANCELLED`)
   - `createdAt`
4. **`Booking`**:
   - `id`, `rideId` (FK -> `Ride`), `passengerId` (FK -> `User`)
   - `seatsRequested` (Int)
   - `status` (`PENDING` | `CONFIRMED` | `REJECTED` | `CANCELLED`)
   - `createdAt`
5. **`Review`**:
   - `id`, `rideId` (FK -> `Ride`), `reviewerId` (FK -> `User`), `driverId` (FK -> `User`)
   - `rating` (Int, 1–5), `comment` (String), `createdAt`

---

## 4. How Uber H3 (`h3-js`) Works in This App (Defense Cheat Sheet)
1. **Indexing on Write (Driver Creates Ride):**
   - Driver clicks pickup point on Leaflet map -> gets `(lat, lng)`.
   - Server calls `latLngToCell(lat, lng, 7)` -> produces a string ID like `"873e62d13ffffff"`.
   - Saved in PostgreSQL in the indexed `originH3Index` column.
2. **Searching on Read (Passenger Discovers Nearby Rides):**
   - Passenger clicks their location (or uses browser geolocation) -> `(lat, lng)`.
   - Server converts it to `userCell = latLngToCell(lat, lng, 7)`.
   - Server gets surrounding hexagons using `gridDisk(userCell, k)`:
     - `k = 0`: Only exact hexagon (1 cell, ~5 km²).
     - `k = 1`: Center + 6 neighbors (7 cells, ~36 km²).
     - `k = 2`: Center + 2 rings (19 cells, ~98 km²).
   - Server queries PostgreSQL: `WHERE status = 'OPEN' AND availableSeats > 0 AND originH3Index IN (cells)`.
   - **Why H3 instead of raw Lat/Lng math?** Exact string index lookup (`IN (...)`) in PostgreSQL is much faster than computing Haversine distance on every row, and hexagons have uniform distance to all 6 neighbors (unlike squares).
3. **Visual Proof on the Map:**
   - The API returns both the matching `rides` and the `hexagons` (polygons via `cellToBoundary(cell)`).
   - Leaflet draws the hexagons on the map so anyone watching the demo immediately sees how H3 partitions the area and finds cars inside those cells!