import { describe, expect, it, vi } from "vitest";
import {
  BookingStatus,
  PaymentStatus,
  PrismaClient,
  RideStatus,
  StandbyStatus,
} from "@prisma/client";
import {
  acceptStandbyOffer,
  cancelBooking,
  joinStandbyQueue,
  requestBooking,
  respondToBooking,
} from "@/services/booking.service";

describe("Booking & Standby Engine (src/services/booking.service.ts)", () => {
  it("confirms immediately and decrements seats on Instant Booking", async () => {
    const rideUpdate = vi.fn(async () => ({}));
    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-1",
              driverId: "driver-1",
              status: RideStatus.OPEN,
              availableSeats: 3,
              price: 95,
              instantBooking: true,
            })),
            update: rideUpdate,
          },
          booking: {
            create: vi.fn(async ({ data }) => ({ id: "booking-1", ...data })),
          },
        })
      ),
    } as unknown as PrismaClient;

    const booking = await requestBooking("passenger-1", "ride-1", 1, "MEDIUM", db);
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.paymentStatus).toBe(PaymentStatus.SIMULATED_PAID);
    expect(booking.luggageUnits).toBe(2);
    expect(rideUpdate).toHaveBeenCalledWith({
      where: { id: "ride-1" },
      data: { availableSeats: { decrement: 1 } },
    });
  });

  it("rejects booking with 409 when availableSeats < seatsRequested", async () => {
    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-1",
              driverId: "driver-1",
              status: RideStatus.OPEN,
              availableSeats: 1,
              price: 95,
              instantBooking: false,
            })),
          },
        })
      ),
    } as unknown as PrismaClient;

    await expect(
      requestBooking("passenger-1", "ride-1", 2, "SMALL", db)
    ).rejects.toThrow("Not enough available seats");
  });

  it("blocks drivers from booking their own rides", async () => {
    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-1",
              driverId: "driver-1",
              status: RideStatus.OPEN,
              availableSeats: 3,
              price: 95,
              instantBooking: false,
            })),
          },
        })
      ),
    } as unknown as PrismaClient;

    await expect(
      requestBooking("driver-1", "ride-1", 1, "NONE", db)
    ).rejects.toThrow("Drivers cannot book their own rides");
  });

  it("driver approving PENDING booking decrements seats and marks SIMULATED_PAID", async () => {
    const rideUpdate = vi.fn(async () => ({}));
    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          booking: {
            findUnique: vi.fn(async () => ({
              id: "b-1",
              rideId: "ride-1",
              passengerId: "passenger-1",
              seatsRequested: 1,
              totalFare: 95,
              status: BookingStatus.PENDING,
              ride: { id: "ride-1", driverId: "driver-1", availableSeats: 2 },
            })),
            update: vi.fn(async ({ data }) => ({ id: "b-1", ...data })),
          },
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-1",
              driverId: "driver-1",
              availableSeats: 2,
              price: 95,
              status: RideStatus.OPEN,
              instantBooking: false,
            })),
            update: rideUpdate,
          },
        })
      ),
    } as unknown as PrismaClient;

    const updated = await respondToBooking("driver-1", "b-1", "CONFIRMED", db);
    expect(updated.status).toBe(BookingStatus.CONFIRMED);
    expect(updated.paymentStatus).toBe(PaymentStatus.SIMULATED_PAID);
    expect(rideUpdate).toHaveBeenCalledWith({
      where: { id: "ride-1" },
      data: { availableSeats: { decrement: 1 } },
    });
  });

  it("cancelling CONFIRMED booking restores seats, refunds, and promotes first WAITING standby to OFFERED", async () => {
    const rideUpdate = vi.fn(async () => ({ availableSeats: 1 }));
    const standbyUpdate = vi.fn(async ({ data }) => ({
      id: "sb-1",
      status: data.status,
    }));

    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          booking: {
            findUnique: vi.fn(async () => ({
              id: "b-1",
              rideId: "ride-1",
              passengerId: "passenger-1",
              seatsRequested: 1,
              status: BookingStatus.CONFIRMED,
              paymentStatus: PaymentStatus.SIMULATED_PAID,
            })),
            update: vi.fn(async ({ data }) => ({ id: "b-1", ...data })),
          },
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-1",
              driverId: "driver-1",
              availableSeats: 0,
              price: 85,
              status: RideStatus.OPEN,
              instantBooking: true,
            })),
            update: rideUpdate,
          },
          standbyRequest: {
            findFirst: vi.fn(async () => ({
              id: "sb-1",
              rideId: "ride-1",
              passengerId: "passenger-2",
              seatsRequested: 1,
              status: StandbyStatus.WAITING,
            })),
            update: standbyUpdate,
          },
        })
      ),
    } as unknown as PrismaClient;

    const result = await cancelBooking("passenger-1", "b-1", db);
    expect(result.booking.status).toBe(BookingStatus.CANCELLED);
    expect(result.booking.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(result.promotedStandby?.status).toBe(StandbyStatus.OFFERED);
    expect(rideUpdate).toHaveBeenCalledWith({
      where: { id: "ride-1" },
      data: { availableSeats: { increment: 1 } },
    });
  });

  it("standby join never decrements seats", async () => {
    const rideUpdate = vi.fn();
    const db = {
      ride: {
        findUnique: vi.fn(async () => ({
          id: "ride-1",
          driverId: "driver-1",
          status: RideStatus.OPEN,
          availableSeats: 0,
        })),
        update: rideUpdate,
      },
      standbyRequest: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({ id: "sb-1", ...data })),
      },
    } as unknown as PrismaClient;

    const sb = await joinStandbyQueue("passenger-2", "ride-1", 1, "SMALL", undefined, db);
    expect(sb.status).toBe(StandbyStatus.WAITING);
    expect(rideUpdate).not.toHaveBeenCalled();
  });

  it("accepting OFFERED standby atomically confirms new booking and decrements seats", async () => {
    const rideUpdate = vi.fn(async () => ({}));
    const db = {
      $transaction: vi.fn(async (cb) =>
        cb({
          standbyRequest: {
            findUnique: vi.fn(async () => ({
              id: "sb-1",
              rideId: "ride-2",
              passengerId: "passenger-2",
              existingConfirmedBookingId: null,
              seatsRequested: 1,
              luggageSize: "SMALL",
              luggageUnits: 1,
              status: StandbyStatus.OFFERED,
            })),
            update: vi.fn(async ({ data }) => ({ id: "sb-1", ...data })),
          },
          ride: {
            findUnique: vi.fn(async () => ({
              id: "ride-2",
              driverId: "driver-1",
              availableSeats: 1,
              price: 85,
              status: RideStatus.OPEN,
              instantBooking: true,
            })),
            update: rideUpdate,
          },
          booking: {
            create: vi.fn(async ({ data }) => ({ id: "b-new", ...data })),
          },
        })
      ),
    } as unknown as PrismaClient;

    const res = await acceptStandbyOffer("passenger-2", "sb-1", db);
    expect(res.booking.status).toBe(BookingStatus.CONFIRMED);
    expect(res.standby.status).toBe(StandbyStatus.PROMOTED);
    expect(rideUpdate).toHaveBeenCalledWith({
      where: { id: "ride-2" },
      data: { availableSeats: { decrement: 1 } },
    });
  });
});
