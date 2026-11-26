import { execSync } from "node:child_process";

const isVercel = Boolean(process.env.VERCEL);
const forceRun = process.argv.includes("--force");

if (!isVercel && !forceRun) {
  console.log("[db-migrate-vercel] Local build detected — skipping automatic DB migration.");
  process.exit(0);
}

const directUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!directUrl) {
  console.warn("[db-migrate-vercel] No database URL found in environment — skipping migration.");
  process.exit(0);
}

const env = {
  ...process.env,
  DATABASE_URL: directUrl,
};

console.log("[db-migrate-vercel] Syncing Prisma schema to production PostgreSQL...");

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  console.log("[db-migrate-vercel] prisma migrate deploy succeeded.");
} catch {
  console.warn(
    "[db-migrate-vercel] prisma migrate deploy failed; falling back to prisma db push --skip-generate..."
  );
  execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
  console.log("[db-migrate-vercel] prisma db push succeeded.");
}

// Idempotent initial seed: only seeds Egyptian rides & admin if the database has 0 rides
console.log("[db-migrate-vercel] Checking whether initial seed is needed...");
try {
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const { latLngToCell } = await import("h3-js");

  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  try {
    // Always ensure admin@along.com exists without overwriting other users
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@along.com" },
    });
    if (!adminExists) {
      const adminHash = await bcrypt.hash("44696237H", 10);
      await prisma.user.create({
        data: {
          name: "Along Admin",
          email: "admin@along.com",
          passwordHash: adminHash,
          phone: "+201000000001",
          bio: "Platform administrator.",
          role: "ADMIN",
          kycStatus: "VERIFIED",
        },
      });
      console.log("[db-migrate-vercel] Created admin@along.com.");
    }

    const rideCount = await prisma.ride.count();
    if (rideCount === 0) {
      console.log("[db-migrate-vercel] Empty rides table detected — seeding initial Egyptian rides...");
      const passHash = await bcrypt.hash("Password123!", 10);

      const ahmed = await prisma.user.upsert({
        where: { email: "ahmed@along.eg" },
        update: {},
        create: {
          name: "Ahmed Hassan",
          email: "ahmed@along.eg",
          passwordHash: passHash,
          phone: "+201011112222",
          bio: "Daily commuter between Zagazig and Cairo.",
          role: "DRIVER",
          kycStatus: "VERIFIED",
        },
      });

      const omar = await prisma.user.upsert({
        where: { email: "omar@along.eg" },
        update: {},
        create: {
          name: "Omar El-Sayed",
          email: "omar@along.eg",
          passwordHash: passHash,
          phone: "+201022223333",
          bio: "Commuting New Cairo ↔ Smart Village.",
          role: "DRIVER",
          kycStatus: "VERIFIED",
        },
      });

      const veh1 = await prisma.vehicle.create({
        data: {
          driverId: ahmed.id,
          make: "Hyundai",
          model: "Elantra CN7",
          year: 2023,
          color: "Silver",
          plateNumber: "س ج أ 4821",
          maxPassengerSeats: 4,
          trunkDescription: "Spacious sedan trunk — fits 2 large + 1 small bag",
          maxLuggageUnits: 7,
        },
      });

      const veh2 = await prisma.vehicle.create({
        data: {
          driverId: omar.id,
          make: "Kia",
          model: "Cerato",
          year: 2022,
          color: "Midnight Blue",
          plateNumber: "ر ق م 9154",
          maxPassengerSeats: 4,
          trunkDescription: "Medium trunk — ideal for carry-ons and backpacks",
          maxLuggageUnits: 6,
        },
      });

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(8, 0, 0, 0);
      const tomorrow10 = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000);
      const inTwoDays = new Date(Date.now() + 48 * 60 * 60 * 1000);
      inTwoDays.setHours(9, 0, 0, 0);

      const rides = [
        {
          driverId: ahmed.id,
          vehicleId: veh1.id,
          originName: "Zagazig University Gate",
          originLat: 30.5877,
          originLng: 31.502,
          destName: "Cairo - Ramses Square",
          destLat: 30.0626,
          destLng: 31.2469,
          departureTime: tomorrow,
          estimatedArrivalTime: new Date(tomorrow.getTime() + 95 * 60 * 1000),
          totalSeats: 3,
          availableSeats: 2,
          price: 95,
          instantBooking: true,
          liveLocationSharingEnabled: true,
          maxLuggageUnits: 7,
          amenities: ["AC", "Max 2 in back", "Instant booking"],
        },
        {
          driverId: omar.id,
          vehicleId: veh2.id,
          originName: "New Cairo - 5th Settlement",
          originLat: 30.0074,
          originLng: 31.4913,
          destName: "Smart Village - 6th of October",
          destLat: 30.0715,
          destLng: 31.0169,
          departureTime: tomorrow,
          estimatedArrivalTime: new Date(tomorrow.getTime() + 75 * 60 * 1000),
          totalSeats: 3,
          availableSeats: 0,
          price: 85,
          instantBooking: true,
          liveLocationSharingEnabled: true,
          maxLuggageUnits: 6,
          amenities: ["AC", "Instant booking"],
        },
        {
          driverId: ahmed.id,
          vehicleId: veh1.id,
          originName: "Zagazig - Al-Qawmia",
          originLat: 30.5945,
          originLng: 31.491,
          destName: "Obour City - Carrefour",
          destLat: 30.2055,
          destLng: 31.4712,
          departureTime: tomorrow10,
          estimatedArrivalTime: new Date(tomorrow10.getTime() + 55 * 60 * 1000),
          totalSeats: 3,
          availableSeats: 3,
          price: 75,
          instantBooking: false,
          liveLocationSharingEnabled: false,
          maxLuggageUnits: 7,
          amenities: ["AC", "Max 2 in back"],
        },
        {
          driverId: omar.id,
          vehicleId: veh2.id,
          originName: "Alexandria - Sidi Gaber",
          originLat: 31.2194,
          originLng: 29.9416,
          destName: "Cairo - Maadi",
          destLat: 29.9602,
          destLng: 31.2569,
          departureTime: inTwoDays,
          estimatedArrivalTime: new Date(inTwoDays.getTime() + 160 * 60 * 1000),
          totalSeats: 3,
          availableSeats: 3,
          price: 220,
          instantBooking: true,
          liveLocationSharingEnabled: true,
          maxLuggageUnits: 6,
          amenities: ["AC", "Pets allowed", "Instant booking"],
        },
      ];

      for (const r of rides) {
        await prisma.ride.create({
          data: {
            ...r,
            originH3Index: latLngToCell(r.originLat, r.originLng, 7),
            status: "OPEN",
          },
        });
      }
      console.log("[db-migrate-vercel] Seeded 4 initial Egyptian rides.");
    } else {
      console.log(`[db-migrate-vercel] Database already has ${rideCount} rides — skipping seed.`);
    }
  } finally {
    await prisma.$disconnect();
  }
} catch (seedErr) {
  console.warn("[db-migrate-vercel] Non-fatal seed warning:", seedErr);
}
