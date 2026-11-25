import { describe, expect, it, vi } from "vitest";
import { BookingStatus, PrismaClient, RideStatus } from "@prisma/client";
import { createReview } from "@/services/review.service";

describe("Review Service (src/services/review.service.ts)", () => {
  it("saves review with tags when ride is COMPLETED and passenger was CONFIRMED", async () => {
    const db = {
      ride: {
        findUnique: vi.fn(async () => ({
          id: "ride-1",
          driverId: "driver-1",
          status: RideStatus.COMPLETED,
        })),
      },
      booking: {
        findFirst: vi.fn(async () => ({
          id: "booking-1",
          status: BookingStatus.CONFIRMED,
        })),
      },
      review: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({ id: "rev-1", ...data })),
      },
    } as unknown as PrismaClient;

    const review = await createReview(
      "passenger-1",
      "ride-1",
      5,
      "Great driver",
      ["Punctual", "Clean Car"],
      undefined,
      db
    );
    expect(review.rating).toBe(5);
    expect(review.tags).toEqual(["Punctual", "Clean Car"]);
  });

  it("rejects out-of-range rating", async () => {
    const db = {} as PrismaClient;
    await expect(
      createReview("passenger-1", "ride-1", 6, "Too high", [], undefined, db)
    ).rejects.toThrow("Rating must be an integer between 1 and 5");
  });

  it("rejects review when ride status is OPEN", async () => {
    const db = {
      ride: {
        findUnique: vi.fn(async () => ({
          id: "ride-1",
          driverId: "driver-1",
          status: RideStatus.OPEN,
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      createReview("passenger-1", "ride-1", 5, "Nice", [], undefined, db)
    ).rejects.toThrow("Reviews can only be submitted for completed rides");
  });
});
