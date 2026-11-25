import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createRide, findNearbyRides, ServiceError } from "@/services/ride.service";
import { getH3Index } from "@/lib/h3";

function createMockDb() {
  return {
    vehicle: {
      findUnique: vi.fn(async () => ({
        id: "veh-1",
        driverId: "driver-1",
        maxPassengerSeats: 4,
        maxLuggageUnits: 6,
      })),
    },
    ride: {
      create: vi.fn(async ({ data }) => ({ id: "ride-1", ...data })),
      findMany: vi.fn(async () => []),
    },
  } as unknown as PrismaClient;
}

describe("Ride Service (src/services/ride.service.ts)", () => {
  const validInput = {
    vehicleId: "veh-1",
    originName: "Zagazig University",
    originLat: 30.5877,
    originLng: 31.502,
    destName: "Cairo - Ramses",
    destLat: 30.0626,
    destLng: 31.2469,
    departureTime: new Date(Date.now() + 86400000).toISOString(),
    totalSeats: 3,
    price: 95,
    instantBooking: true,
    amenities: ["AC", "Instant booking"],
  };

  it("computes Resolution-7 originH3Index and sets availableSeats", async () => {
    const db = createMockDb();
    const ride = await createRide("driver-1", validInput, db);

    expect(ride.originH3Index).toBe(getH3Index(30.5877, 31.502));
    expect(ride.availableSeats).toBe(3);
    expect(db.ride.create).toHaveBeenCalledTimes(1);
  });

  it("rejects seats exceeding vehicle maxPassengerSeats", async () => {
    const db = createMockDb();
    await expect(
      createRide("driver-1", { ...validInput, totalSeats: 6 }, db)
    ).rejects.toThrow(ServiceError);
  });

  it("rejects negative price", async () => {
    const db = createMockDb();
    await expect(
      createRide("driver-1", { ...validInput, price: -10 }, db)
    ).rejects.toThrow(ServiceError);
  });

  it("queries PostgreSQL using H3 gridDisk cells without returning hexagons", async () => {
    const db = createMockDb();
    const result = await findNearbyRides(
      { lat: 30.5877, lng: 31.502, ringSize: 1 },
      db
    );

    expect(result.rides).toEqual([]);
    expect(db.ride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "OPEN",
          originH3Index: { in: expect.any(Array) },
        }),
      })
    );
  });
});
