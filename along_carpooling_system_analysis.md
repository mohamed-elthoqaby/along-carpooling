# Along Carpooling Platform — Complete System Analysis & Technical Specification

* **Reference UX/UI Product:** [Along — Carpooling App | UX/UI Case Study on Behance](https://www.behance.net/gallery/258872423/Along-Carpooling-App-UXUI-Case-Study) (by Pranjul Chawla)
* **Companion Document:** `along-carpooling-design-system.md`
* **Purpose:** End-to-end functional analysis, domain modeling, API/real-time architecture, state machines, edge-case rules, and phased roadmap to engineer an exact peer-to-peer paid carpooling platform (Web & Mobile) modeled on **Along**.

---

## 1. Product Overview & Business Model

### 1.1 Core Value Proposition

**Along** is a peer-to-peer (P2P) carpooling marketplace connecting **Drivers** who are already traveling between two locations (intercity trips or recurring daily commutes) with **Passengers** heading along the same route who pay a per-seat fare to split travel costs.

### 1.2 Marketplace Mechanics

* **Unified Account Model:** Any registered user can act as both a **Passenger** (searching and booking seats) and a **Driver** (publishing rides and earning per-seat contributions), subject to role-specific verification gates (e.g., vehicle details & government ID verification for publishing).
* **Two Core Travel Modes:**
  1. **Intercity Rides:** Scheduled point-to-point trips with seat selection, luggage trunk compatibility checks, and optional **Standby Booking** backup.
  2. **Daily Commutes:** Recurring corridor travel supported by **Commuter Groups** in Chat for repeat riders on the same route.
* **Monetization Model (Configurable):**
  * **Passenger Service Fee:** Fixed fee or percentage (e.g., `10%–15%`) added on top of the driver's per-seat price at checkout.
  * **Optional Driver Commission:** `0%` (to maximize driver supply early on) or a small platform fee deducted from payout.
  * **Escrow Settlement:** Passenger pays upfront upon booking confirmation; funds are held in escrow and released to the driver after verified trip completion to prevent no-shows and cash disputes.

---

## 2. User Roles & Permissions Matrix

| Capability | Guest | Unverified User | Verified Passenger | Verified Driver | Platform Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Browse / Search public rides | Yes | Yes | Yes | Yes | Yes |
| Save Quick Searches | No | Yes | Yes | Yes | Yes |
| Book a seat / Request Standby | No | Limited (if KYC optional) | Yes | Yes | No |
| Publish a ride (7-step flow) | No | No | No (needs vehicle) | Yes | No |
| Upload vehicle & trunk specs | No | Yes | Yes | Yes | Yes |
| Chat (Individual & Groups) | No | Active bookings only | Yes | Yes | Moderation |
| Share / View Live GPS & ETA | No | No | View (if driver allows) | Share (opt-in) | Audit only |
| Rate & Review post-trip | No | No | Yes | Yes | Moderate |
| Approve KYC / Resolve Disputes | No | No | No | No | Yes |

---

## 3. Detailed Functional Requirements by Module

### Module A: Onboarding, Authentication & Trust Verification

1. **Multi-Method Authentication:**
   * Sign up / Login via **Phone Number** (with country code selector + 4-digit OTP), **Email** (OTP or password), or **Google OAuth** (`Continue with Google`).
   * Rate limiting on OTP requests (e.g., max 3 OTPs per 10 minutes, 5-minute TTL, max 5 failed attempts).
2. **Profile Completion:**
   * Mandatory fields: Full name, profile photo, phone/email verification, short bio, gender/travel preferences (optional).
3. **Trust & KYC Verification:**
   * **3-Tier Verification Badges:** Phone Verified, Email Verified, Government ID Verified (National ID / Driver's License upload + selfie match or manual/automated KYC provider).
   * **Vehicle Registration (Drivers):** Make, model, year, color, license plate, total passenger seat capacity, and **Trunk Photo + Trunk Capacity Metadata** (used by the Smart Luggage Fit Check).

### Module B: Ride Publishing Engine (7-Step Wizard)

Drivers publish rides through a structured 7-step flow with draft persistence (so dropping off mid-flow doesn't lose data):

| Step | Data Captured | Validation & Business Rules |
| :--- | :--- | :--- |
| **1. Route** | Origin, Destination, optional intermediate stopovers/waypoints | Must resolve to valid coordinates (`lat`, `lng`) via Places/Routing API; compute route polyline & estimated duration/distance. |
| **2. Schedule** | Departure date, departure time, optional flexibility window or recurring days | Must be in the future (e.g., at least `30 mins` ahead); prevent overlapping published rides for the same driver. |
| **3. Seats & Pricing** | Available seats (`1–6`), per-seat price, booking mode (`Instant Book` vs. `Approval Required`) | Seat count `<= vehicle.max_passenger_seats`; optional suggested fair-price range based on distance to prevent gouging. |
| **4. Luggage & Trunk** | Select vehicle, upload/confirm trunk photo, trunk description, max luggage capacity (e.g., `2 Medium + 1 Small` or total luggage points) | Trunk photo + capacity metadata required for intercity rides to power passenger luggage fit warnings. |
| **5. Live Tracking Consent** | Toggle: `Share Live Location & ETA with booked passengers` | Default `OFF` or explicit opt-in; driver can toggle before or during the trip; strictly controls passenger visibility. |
| **6. Ride Amenities** | Multi-select checkboxes: `AC`, `Max 2 in back`, `Pets allowed`, `Instant booking`, `Smoking allowed` | If `Max 2 in back` is enabled on a standard 5-seat sedan, cap rear available seats to `2`. |
| **7. Review & Publish** | Full summary card preview + Publish CTA | Transitions ride to `PUBLISHED` and indexes it for geospatial search immediately. |

### Module C: Search, Discovery, Quick Search & Filtering

1. **Search Query Parameters:**
   * `origin (lat, lng)`, `destination (lat, lng)`, `date`, `passengers (int >= 1)`.
   * **Swap Origin/Destination** one-tap action.
2. **Geospatial Route Matching (Corridor Matching):**
   * Do **not** match only exact city strings. Match rides where:
     * Passenger's origin is within configurable radius (e.g., `5–15 km`) of the ride's origin OR any route waypoint/polyline segment.
     * Passenger's destination is within radius of the ride's destination OR a later point along the same directional polyline (`pickup_order < dropoff_order`).
     * Remaining seats `>= requested_passengers`.
     * Ride status is `PUBLISHED` and `departure_time > NOW()`.
3. **Quick Search (Saved Routes):**
   * Automatically stores recent searches and allows pinning favorite routes on the Home screen for 1-tap re-querying.
4. **Filter Bottom Sheet & Sorting:**
   * **Departure Time Window:** Dual-thumb range slider (`00:00` to `23:59`).
   * **Amenities:** Filter by `AC`, `Max 2 in back`, `Pets allowed`, `Instant booking`, `Smoking allowed`.
   * **Trust Filters:** Verified Government ID drivers only, minimum rating (e.g., `4.0+`).
   * **Sorting:** Earliest departure, Lowest price, Closest pickup point, Highest driver rating.

### Module D: Seat Selection & Smart Luggage Fit Check

1. **Seat Selection:**
   * Passenger chooses number of seats (and optionally specific seat position if seat-map mode is enabled: Front Passenger vs. Rear Left/Right).
2. **Luggage Selection:**
   * Passenger selects luggage tier per passenger: `None`, `Small` (backpack/cabin tote = `1 unit`), `Medium` (carry-on suitcase = `2 units`), `Large` (checked suitcase = `3 units`).
3. **Smart Luggage Fit Check Logic:**
   * System calculates: `used_luggage_units = SUM(confirmed_bookings.luggage_units)`.
   * Compares `used_luggage_units + requested_luggage_units` against `ride.max_luggage_units`.
   * **Outcome Banners:**
     * **Fits Comfortably (`<= 80%` capacity):** Green/Blue positive fit banner alongside driver's trunk photo.
     * **Tight Fit (`81%–100%` capacity):** Amber caution banner advising passenger to confirm with driver in chat.
     * **Exceeds Capacity (`> 100%` capacity):** Warning banner recommending a smaller bag or messaging the driver before requesting.

### Module E: Booking & Standby Booking Engine (Core Differentiator)

This is one of the most important engineering parts of **Along** and must be rock-solid under concurrency.

#### 1. Booking State Machine

* **Standard Booking States:**
  * `PENDING_APPROVAL` (for non-instant rides; auto-expires if driver doesn't respond within `X` hours or before departure)
  * `CONFIRMED` (seat locked & decremented from `ride.available_seats`; payment authorized/captured into escrow)
  * `COMPLETED` (trip finished; triggers payout & review prompt)
  * `CANCELLED_BY_PASSENGER` / `CANCELLED_BY_DRIVER` / `REJECTED` / `EXPIRED`

#### 2. Standby Booking Business Rules

* **Purpose:** Allows a passenger who already has a `CONFIRMED` ride (e.g., less ideal time) or is looking at a full/preferred ride to place a **Standby Request** on another ride without losing their confirmed seat.
* **Strict Constraints:**
  1. A passenger can hold **at most 1 `CONFIRMED` booking** for an overlapping travel window, PLUS **1 (or configurable N) `STANDBY` request(s)** on alternative rides.
  2. A `STANDBY` request **NEVER decrements `available_seats`** on the target ride and **NEVER charges** the passenger upfront (optional payment method pre-check only).
  3. A `STANDBY` request **NEVER automatically overrides or cancels** an existing `CONFIRMED` booking.
  4. **Standby Promotion Flow:**
     * When a seat opens on the target ride (e.g., another passenger cancels), the system notifies the first eligible passenger in the FIFO standby queue (`STANDBY_OFFERED`) with a short claim timer (e.g., `15–30 minutes`).
     * If the passenger **accepts** the offer: in a single atomic database transaction, the system cancels their previous conflicting `CONFIRMED` booking (subject to cancellation policy / free swap window), releases that old seat, decrements the new ride's `available_seats`, and promotes the standby record to `CONFIRMED`.
     * If the timer expires or passenger declines: the offer cascades to the next person in the standby queue.

#### 3. Concurrency & Race-Condition Protection

* Use a **PostgreSQL transaction with `SELECT ... FOR UPDATE`** on the `rides` row (or optimistic locking via `version` column) whenever confirming a booking or promoting a standby offer:
  * Verify `available_seats >= requested_seats` inside the lock.
  * Decrement `available_seats` atomically.
  * Enforce an idempotency key (`Idempotency-Key` header) on booking creation endpoints to prevent duplicate bookings on flaky mobile networks.

### Module F: Live Trip Lifecycle & Privacy-Gated ETA

* **Trip Status Lifecycle:** `PUBLISHED` → `DRIVER_EN_ROUTE` → `BOARDING` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED`).
* **Privacy-Gated Live Tracking:**
  * Driver app streams GPS coordinates (`lat`, `lng`, `heading`, `speed`, `timestamp`) via WebSocket/HTTP every `5–10 seconds` **only** when the trip is active (`DRIVER_EN_ROUTE` / `IN_PROGRESS`) **AND** `ride.live_location_sharing_enabled == true`.
  * Server checks `live_location_sharing_enabled` before broadcasting location or ETA updates to booked passengers; if `false`, passengers only see static trip status and scheduled pickup time.
  * Server computes live ETA using a routing matrix API (throttled to every `30–60 seconds` to control API cost) and pushes *"Driver is on the way • ETA X mins"* to confirmed passengers.

### Module G: In-App Chat & Commuter Groups

1. **Individual Chat (`Individual` Tab):**
   * Auto-created 1-to-1 thread between Driver and Passenger once a booking request or confirmation occurs (or via pre-booking inquiry).
   * Embeds system event messages inline (e.g., *"Booking Confirmed — 1 Seat, Medium Bag"*, *"Pickup updated"*).
2. **Commuter Groups (`Groups` Tab):**
   * Persistent route-based group chats for regular daily commuters traveling along the same corridor (e.g., *"New Cairo ↔ Smart Village Daily 8 AM"*).
   * Members can announce upcoming availability, coordinate recurring carpools, and quickly link to a published ride card inside the group.
3. **Safety Rules:**
   * Mask personal phone numbers by default until booking is `CONFIRMED`; support message reporting and user blocking.

### Module H: Reputation, Ratings & AI Profile Overview

1. **Bidirectional Reviews:**
   * Triggered automatically upon `COMPLETED` trip; double-blind window (reviews become visible once both parties submit or after 7 days) to prevent retaliatory ratings.
   * Captures `1–5` star rating, structured tags (e.g., *Punctual*, *Clean Car*, *Safe Driving*, *Friendly*), and optional text comment.
2. **Profile Stats (3-Column Card):**
   * Aggregated real-time/cached counters: `Rides Completed`, `Average Rating`, and `Reliability / On-Time %` (or `Rides Published` / `Rides Taken`).
3. **AI Profile Overview (`AI Overview` Card):**
   * Asynchronous background job triggered when a user accumulates `>= 3` reviews (and refreshed every `N` new reviews).
   * Feeds sanitized review texts + completion/cancellation metrics into an LLM to generate a concise 2–3 sentence objective summary highlighting strengths (e.g., punctuality, communication, driving comfort).
   * Stored in `users.ai_overview_text` with `ai_overview_updated_at` so profile loads require zero real-time LLM latency.

### Module I: Payments, Escrow, Cancellation & Refunds

1. **Payment Flow:**
   * Passenger pays `seat_price * seats + platform_fee` via payment gateway (e.g., Stripe, Paymob, Fawry, Razorpay depending on target market).
   * Funds are captured into platform escrow (or authorized and captured at trip start).
   * Payout to driver's wallet/bank account is triggered `24 hours` after `COMPLETED` status (allowing a dispute window).
2. **Cancellation Policy Matrix (Configurable):**

| Scenario | Passenger Refund | Driver Payout / Penalty |
| :--- | :--- | :--- |
| Passenger cancels `> 24h` before departure | `100%` fare refund (service fee optional) | `$0` |
| Passenger cancels `2h–24h` before departure | `50%` fare refund | `50%` compensation |
| Passenger cancels `< 2h` or No-Show | `0%` refund | `100%` fare payout |
| Driver cancels at any time | `100%` full refund (incl. service fee) | Cancellation recorded on driver reliability score; standby/rebooking alert sent to passengers |

---

## 4. Domain Data Model & Database Schema

Recommended primary database: **PostgreSQL 16+ with PostGIS** (for geospatial corridor matching) + **Redis** (for OTPs, real-time GPS cache, rate limits, and WebSocket pub/sub).

### 4.1 Core Tables & Key Columns

| Table | Key Columns | Key Constraints & Indexes |
| :--- | :--- | :--- |
| **`users`** | `id (UUID PK)`, `full_name`, `email (UNIQUE)`, `phone (UNIQUE)`, `password_hash`, `avatar_url`, `bio`, `is_phone_verified`, `is_email_verified`, `kyc_status (ENUM)`, `avg_rating (DECIMAL)`, `total_reviews (INT)`, `rides_published_count`, `rides_taken_count`, `ai_overview_text`, `ai_overview_updated_at`, `created_at` | Index on `phone`, `email`, `kyc_status` |
| **`user_verifications`** | `id (UUID PK)`, `user_id (FK -> users)`, `doc_type (NATIONAL_ID/LICENSE)`, `doc_front_url`, `doc_back_url`, `selfie_url`, `status (PENDING/APPROVED/REJECTED)`, `reviewed_by`, `reviewed_at` | Index on `(user_id, status)` |
| **`vehicles`** | `id (UUID PK)`, `driver_id (FK -> users)`, `make`, `model`, `year`, `color`, `plate_number`, `max_passenger_seats`, `trunk_photo_url`, `trunk_description`, `max_luggage_units (INT)`, `is_default (BOOL)` | Index on `driver_id` |
| **`rides`** | `id (UUID PK)`, `driver_id (FK -> users)`, `vehicle_id (FK -> vehicles)`, `origin_name`, `origin_point (GEOGRAPHY Point)`, `dest_name`, `dest_point (GEOGRAPHY Point)`, `route_polyline (GEOGRAPHY LineString)`, `departure_time (TIMESTAMPTZ)`, `estimated_arrival_time`, `total_seats`, `available_seats`, `price_per_seat (DECIMAL)`, `currency`, `instant_booking (BOOL)`, `live_location_sharing_enabled (BOOL)`, `max_luggage_units`, `amenities (JSONB)`, `status (ENUM)`, `version (INT)`, `created_at` | **GIST spatial indexes** on `origin_point`, `dest_point`, `route_polyline`; B-tree on `(status, departure_time)` |
| **`ride_waypoints`** | `id (UUID PK)`, `ride_id (FK -> rides)`, `stop_order (INT)`, `location_name`, `location_point (GEOGRAPHY Point)`, `estimated_time`, `price_from_origin` | Unique `(ride_id, stop_order)`; GIST index on `location_point` |
| **`bookings`** | `id (UUID PK)`, `ride_id (FK -> rides)`, `passenger_id (FK -> users)`, `pickup_name`, `pickup_point`, `dropoff_name`, `dropoff_point`, `seats_booked (INT)`, `luggage_size (NONE/SMALL/MEDIUM/LARGE)`, `luggage_units (INT)`, `total_fare`, `platform_fee`, `status (ENUM)`, `idempotency_key (UNIQUE)`, `created_at`, `cancelled_at` | Index on `(passenger_id, status)`, `(ride_id, status)`; check `seats_booked > 0` |
| **`standby_requests`** | `id (UUID PK)`, `ride_id (FK -> rides)`, `passenger_id (FK -> users)`, `existing_confirmed_booking_id (FK -> bookings, NULLABLE)`, `seats_requested`, `luggage_size`, `luggage_units`, `status (WAITING/OFFERED/PROMOTED/EXPIRED/CANCELLED)`, `offer_expires_at`, `created_at` | Unique active standby per `(ride_id, passenger_id)`; index on `(ride_id, status, created_at)` for FIFO queue |
| **`payments`** | `id (UUID PK)`, `booking_id (FK -> bookings)`, `payer_id`, `payee_id`, `amount`, `platform_fee`, `currency`, `provider_ref`, `status (AUTHORIZED/CAPTURED_ESCROW/RELEASED/REFUNDED/FAILED)`, `created_at` | Index on `booking_id`, `status` |
| **`chat_rooms`** | `id (UUID PK)`, `type (INDIVIDUAL/GROUP)`, `ride_id (FK -> rides, NULLABLE)`, `group_name`, `corridor_origin`, `corridor_dest`, `created_at` | Index on `type`, `ride_id` |
| **`chat_members`** | `room_id (FK -> chat_rooms)`, `user_id (FK -> users)`, `role (MEMBER/ADMIN)`, `joined_at`, `last_read_at` | Composite PK `(room_id, user_id)` |
| **`chat_messages`** | `id (UUID PK)`, `room_id (FK -> chat_rooms)`, `sender_id (FK -> users, NULLABLE for system)`, `message_type (TEXT/SYSTEM/RIDE_CARD)`, `body`, `metadata (JSONB)`, `created_at` | Index on `(room_id, created_at DESC)` |
| **`reviews`** | `id (UUID PK)`, `booking_id (FK -> bookings)`, `reviewer_id`, `reviewee_id`, `rating (1–5)`, `tags (TEXT[])`, `comment`, `is_visible (BOOL)`, `created_at` | Unique `(booking_id, reviewer_id)`; index on `reviewee_id` |
| **`saved_searches`** | `id (UUID PK)`, `user_id (FK -> users)`, `origin_name`, `origin_point`, `dest_name`, `dest_point`, `is_pinned (BOOL)`, `last_used_at` | Index on `(user_id, last_used_at DESC)` |

---

## 5. Core API Endpoints & Real-Time Events

### 5.1 REST API Overview

| Domain | Method & Endpoint | Description |
| :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/otp/send` | Send 4-digit OTP via SMS or Email |
| **Auth** | `POST /api/v1/auth/otp/verify` | Verify OTP and issue JWT access + refresh tokens |
| **Auth** | `POST /api/v1/auth/google` | Authenticate via Google ID token |
| **Profile & KYC** | `GET / PATCH /api/v1/users/me` | Fetch or update user profile & bio |
| **Profile & KYC** | `GET /api/v1/users/:id/profile` | Public profile with verification badges, stats, reviews, and `AI Overview` |
| **Profile & KYC** | `POST /api/v1/users/me/kyc` | Submit Government ID documents for verification |
| **Vehicles** | `GET / POST /api/v1/vehicles` | List or register driver vehicle with trunk photo & luggage capacity |
| **Rides** | `POST /api/v1/rides` | Publish a new ride (7-step payload) |
| **Rides** | `GET /api/v1/rides/search` | Geospatial search with time range, amenities, seats, and sort params |
| **Rides** | `GET /api/v1/rides/:id` | Ride details, driver info, trunk photo, amenities, and seat/luggage capacity |
| **Rides** | `POST /api/v1/rides/:id/luggage-check` | Evaluate selected luggage size against remaining trunk capacity |
| **Rides** | `PATCH /api/v1/rides/:id/status` | Driver transitions trip state (`DRIVER_EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) |
| **Rides** | `PATCH /api/v1/rides/:id/location-sharing` | Driver toggles `live_location_sharing_enabled` |
| **Bookings** | `POST /api/v1/bookings` | Create booking (`Instant` or `Pending`); requires `Idempotency-Key` |
| **Bookings** | `POST /api/v1/bookings/:id/approve` | Driver approves or rejects a pending booking request |
| **Bookings** | `POST /api/v1/bookings/:id/cancel` | Cancel booking, apply refund rules, and trigger standby promotion |
| **Bookings** | `GET /api/v1/bookings/me` | List user's `Booked` / `Published` rides filtered by `Upcoming`, `Standby`, `Past`, `Cancelled` |
| **Standby** | `POST /api/v1/rides/:id/standby` | Join FIFO standby queue for a ride |
| **Standby** | `POST /api/v1/standby/:id/accept` | Atomically accept standby offer (and swap out conflicting confirmed booking if applicable) |
| **Chat** | `GET /api/v1/chats?type=INDIVIDUAL\|GROUP` | List user's individual or commuter group chat rooms |
| **Chat** | `GET / POST /api/v1/chats/:roomId/messages` | Paginated message history and fallback send endpoint |
| **Reviews** | `POST /api/v1/bookings/:id/reviews` | Submit post-trip rating, tags, and comment |

### 5.2 Real-Time WebSocket Channels

* **`ws://.../chat/{roomId}`:** Live text messages, typing indicators, read receipts, and inline booking status cards.
* **`ws://.../rides/{rideId}/tracking`:** Driver pushes GPS pings; server broadcasts `{lat, lng, eta_minutes, status}` to confirmed passengers **only** if `live_location_sharing_enabled == true`.
* **`ws://.../users/{userId}/notifications`:** Instant push for booking approvals, standby offer countdowns (`15 min` window), and cancellation alerts.

---

## 6. System Architecture & Engineering Guidelines

### 6.1 Recommended High-Level Architecture

* **Client Layer:** Responsive Web App + Mobile App (Flutter / React Native) consuming the shared design tokens from `along-carpooling-design-system.md`.
* **API & Real-Time Backend:** Modular monolith (clean separation by domain: Auth, Rides, Bookings/Standby, Payments, Chat, Tracking, Reviews) exposing REST + WebSockets/SignalR.
* **Data Layer:**
  * **PostgreSQL + PostGIS:** Source of truth for relational integrity, transactional seat locking, and geospatial route matching (`ST_DWithin` against `route_polyline`).
  * **Redis:** OTP storage with TTL, live driver GPS cache, rate limiting, and pub/sub for scaling WebSockets across instances.
  * **Object Storage (S3 / GCS / Cloudflare R2):** Encrypted private storage for KYC documents (signed short-lived URLs only) and public CDN-backed storage for avatars and trunk photos.
* **Background Workers / Queues:**
  * **Standby Expiration Worker:** Auto-expires unaccepted standby offers and promotes the next rider in queue.
  * **Booking Auto-Expiry Worker:** Cancels unanswered `PENDING_APPROVAL` bookings before departure.
  * **Payout Settlement Worker:** Releases escrow funds to drivers 24 hours after trip completion.
  * **AI Overview Worker:** Regenerates `users.ai_overview_text` asynchronously after new verified reviews.
* **External Integrations:**
  * **Maps & Routing:** Google Maps Platform / Mapbox / OSRM (geocoding, autocomplete, route polylines, ETA matrix).
  * **Payments:** Local & international gateway supporting escrow/split payouts (e.g., Paymob/Stripe).
  * **Notifications:** Firebase Cloud Messaging (Push), SMS gateway (OTP), Transactional Email.

---

## 7. Critical Edge Cases & Non-Functional Requirements

| Category | Edge Case / Requirement | Required System Behavior |
| :--- | :--- | :--- |
| **Concurrency** | Two passengers book the last seat simultaneously | Row-level DB lock (`SELECT FOR UPDATE` on `rides`) ensures exactly one succeeds; the second receives `409 Conflict` with an option to join `Standby`. |
| **Standby Conflict** | Passenger accepts a Standby offer while holding another Confirmed ride | Atomic DB transaction cancels the old booking (releasing its seat & triggering *its* standby queue) and confirms the new ride together. |
| **Luggage Overflow** | Two passengers each bring a Large bag exceeding trunk units | Smart Luggage Fit Check sums all confirmed bags + new bag against `ride.max_luggage_units` and surfaces a warning before booking. |
| **Driver No-Show** | Driver never starts the trip or cancels last minute | Automatic full passenger refund from escrow, driver reliability score penalty, and push notification suggesting nearest alternative rides on the same corridor. |
| **Location Privacy** | Driver disables Live Location mid-trip | Backend immediately stops broadcasting GPS coordinates and switches passenger UI to static trip status. |
| **Security & PII** | KYC ID images and phone numbers | Store KYC docs in private encrypted buckets with strict RBAC; never expose raw phone numbers in public ride search responses. |
| **Performance** | Search latency under load | Spatial GIST indexes on PostGIS `route_polyline` + bounding-box pre-filter keep search queries under `150ms`. |

---

## 8. Phased Implementation Roadmap

1. **Phase 1 — Core Marketplace MVP (Weeks 1–6):**
   * Auth (Phone/Email OTP + Google), User Profiles, Vehicle Registration.
   * 7-Step Ride Publishing (core fields + amenities) & PostGIS Search + Filters.
   * Instant & Approval-based Booking with transactional seat locking.
   * Basic 1-to-1 Trip Chat, Push/Email Notifications, and Post-Trip Ratings.
2. **Phase 2 — Along Differentiators & Payments (Weeks 7–10):**
   * Escrow Payments, Cancellation/Refund Engine, and Driver Payouts.
   * **Standby Booking Engine** (FIFO queue, timed promotion offers, atomic swap).
   * **Smart Luggage Fit Check** (trunk photo + capacity math + fit banners).
   * **Privacy-Gated Live Location & ETA** streaming.
   * Government ID KYC Verification workflow & Admin review panel.
3. **Phase 3 — Community & Intelligence (Weeks 11–14):**
   * **Commuter Groups** for recurring daily routes.
   * **AI Profile Overview** background summarization pipeline.
   * `Quick Search` pinned routes, fraud/anomaly detection, and analytics dashboard.
