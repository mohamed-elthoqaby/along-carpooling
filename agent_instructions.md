# AGENT.md — Development Guidelines & Rules

## 1. Project Overview
This is a university full-stack **Carpooling / Ride-Sharing Web Application** built to satisfy three academic courses simultaneously:
1. **Web Development** (Full-stack Next.js + TypeScript + PostgreSQL + Interactive Map)
2. **Software Engineering** (Clean architecture, documented FR/NFR, clear actors & workflows)
3. **Software Testing / Verification** (Testable business logic, automated unit/integration tests, traceability to requirements)

## 2. Core Philosophy: KISS (Keep It Simple, Stupid)
- **NO over-engineering.** The goal is a clean, working, well-tested MVP that a student can easily explain and defend in an oral exam.
- **DO NOT add:** Real-time GPS tracking, WebSockets, payment gateways, email/SMS services, Redis, Docker Compose complexity, microservices, or AI/ML matching.
- **DO focus on:** Clean TypeScript code, proper PostgreSQL relations, atomic seat updates during booking, clear Uber H3 geospatial lookup, and thorough unit/API tests.

## 3. Tech Stack (Strict)
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (keep UI clean, minimal, and functional)
- **Database:** PostgreSQL
- **ORM:** Prisma ORM
- **Authentication:** Simple custom Auth using `bcryptjs` (password hashing) + `jose` (JWT stored in HTTP-only cookies). *Do not use NextAuth/Auth.js to keep auth logic transparent and easy to explain.*
- **Map UI:** `leaflet` + `react-leaflet` with OpenStreetMap tiles (100% free, no API key required). Remember to dynamically import Leaflet components with `{ ssr: false }`.
- **Geospatial Indexing:** `h3-js` (Uber's H3 Hexagonal Hierarchical Spatial Index).
- **Validation:** `zod` for request body validation.
- **Testing:** `vitest` for unit & service-layer tests.

## 4. Architecture & Folder Structure
Keep business logic separated from Next.js API route handlers so it can be easily unit-tested for the Software Testing course.

```text
src/
├── app/
│   ├── api/                 # Thin REST API Route Handlers (validate -> call service -> return JSON)
│   │   ├── auth/            # register, login, logout, me
│   │   ├── rides/           # CRUD + nearby H3 search
│   │   ├── bookings/        # create, accept/reject, cancel
│   │   ├── reviews/         # create, list by driver
│   │   └── admin/           # users, rides, stats
│   ├── (auth)/              # /login, /register
│   ├── dashboard/           # Role-based dashboard (Driver / Passenger)
│   ├── rides/               # Explore map & nearby rides, Create ride, Ride details
│   └── admin/               # Minimal Admin panel
├── components/
│   ├── map/                 # Client-only Leaflet Map & H3 Hexagon overlay components
│   └── ui/                  # Simple reusable components (Navbar, Cards, Forms)
├── lib/
│   ├── prisma.ts            # Prisma client singleton
│   ├── auth.ts              # JWT sign/verify & session helper
│   └── h3.ts                # Uber H3 helper functions (latLngToCell, gridDisk, cellToBoundary)
├── services/                # Pure business logic (PRIMARY TARGET FOR UNIT TESTS)
│   ├── ride.service.ts
│   ├── booking.service.ts
│   └── review.service.ts
└── __tests__/               # Vitest test files mirroring services/ and lib/
```

## 5. Uber H3 Implementation Rules
- Use **H3 Resolution 7** (`H3_RESOLUTION = 7`, ~1.22 km average hexagon edge length) as a constant in `src/lib/h3.ts`.
- Whenever a Driver creates a ride with `(originLat, originLng)`, compute and store `originH3Index = latLngToCell(originLat, originLng, 7)` in PostgreSQL.
- When a Passenger searches for nearby rides at `(lat, lng)` with ring size `k` (default `k = 1`, expandable to `k = 2`), compute `const cells = gridDisk(userCell, k)` and query PostgreSQL with `WHERE originH3Index IN (cells)`.
- Expose the searched H3 hexagon boundaries (`cellToBoundary`) to the frontend map so the hexagons are visually rendered on Leaflet.

## 6. Agent Execution Workflow
1. Always read `PROJECT_PLAN.md` and `IMPLEMENTATION_PHASES.md` before writing code.
2. Work on **ONE phase at a time**. Do not jump ahead.
3. After completing each phase, verify TypeScript compiles (`npx tsc --noEmit`) and run tests (`npm test`) if applicable.
4. Keep every function short, well-typed, and easy to read.