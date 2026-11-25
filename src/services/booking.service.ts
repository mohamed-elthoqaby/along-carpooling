import {
  BookingStatus,
  LuggageSize,
  PaymentStatus,
  PrismaClient,
  RideStatus,
  StandbyStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLuggageUnits, LuggageSizeType } from "@/lib/luggage";
import { ServiceError } from "@/services/ride.service";

interface LockedRideRow {
  id: string;
  driverId: string;
  availableSeats: number;
  price: number;
  status: RideStatus;
  instantBooking: boolean;
}

async function lockRideForUpdate(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  rideId: string
): Promise<LockedRideRow | null> {
  if (typeof (tx as PrismaClient).$queryRaw === "function") {
    const rows = await (tx as PrismaClient).$queryRaw<LockedRideRow[]>`
      SELECT "id", "driverId", "availableSeats", "price", "status", "instantBooking"
      FROM "Ride"
      WHERE "id" = ${rideId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }
  const ride = await tx.ride.findUnique({ where: { id: rideId } });
  if (!ride) return null;
  return {
    id: ride.id,
    driverId: ride.driverId,
    availableSeats: ride.availableSeats,
    price: ride.price,
    status: ride.status,
    instantBooking: ride.instantBooking,
  };
}

async function ensureTripChatRoom(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  rideId: string,
  driverId: string,
  passengerId: string,
  systemMessage?: string
) {
  if (!tx.chatRoom || typeof tx.chatRoom.upsert !== "function") return;
  const room = await tx.chatRoom.upsert({
    where: {
      rideId_driverId_passengerId: { rideId, driverId, passengerId },
    },
    update: {},
    create: { rideId, driverId, passengerId },
  });

  if (systemMessage && tx.chatMessage) {
    await tx.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: null,
        body: systemMessage,
        isSystem: true,
      },
    });
  }
}

async function promoteNextStandby(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  rideId: string,
  availableSeatsAfterRestore: number
) {
  if (!tx.standbyRequest || typeof tx.standbyRequest.findFirst !== "function") {
    return null;
  }
  const nextWaiting = await tx.standbyRequest.findFirst({
    where: {
      rideId,
      status: StandbyStatus.WAITING,
      seatsRequested: { lte: availableSeatsAfterRestore },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!nextWaiting) return null;

  return tx.standbyRequest.update({
    where: { id: nextWaiting.id },
    data: {
      status: StandbyStatus.OFFERED,
      offerExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
}

export async function requestBooking(
  passengerId: string,
  rideId: string,
  seatsRequested: number,
  luggageSize: LuggageSizeType = "NONE",
  db: PrismaClient = prisma
) {
  if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
    throw new ServiceError("Requested seats must be a positive integer", 400);
  }

  return db.$transaction(async (tx) => {
    const ride = await lockRideForUpdate(tx, rideId);
    if (!ride) {
      throw new ServiceError("Ride not found", 404);
    }
    if (ride.status !== RideStatus.OPEN) {
      throw new ServiceError("Ride is not open for booking", 400);
    }
    if (ride.driverId === passengerId) {
      throw new ServiceError("Drivers cannot book their own rides", 400);
    }
    if (ride.availableSeats < seatsRequested) {
      throw new ServiceError("Not enough available seats", 409);
    }

    const luggageUnits = getLuggageUnits(luggageSize);
    const totalFare = ride.price * seatsRequested;
    const isInstant = Boolean(ride.instantBooking);

    if (isInstant) {
      await tx.ride.update({
        where: { id: rideId },
        data: { availableSeats: { decrement: seatsRequested } },
      });
    }

    const booking = await tx.booking.create({
      data: {
        rideId,
        passengerId,
        seatsRequested,
        luggageSize: luggageSize as LuggageSize,
        luggageUnits,
        totalFare,
        paymentStatus: isInstant
          ? PaymentStatus.SIMULATED_PAID
          : PaymentStatus.NONE,
        status: isInstant ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      },
    });

    await ensureTripChatRoom(
      tx,
      rideId,
      ride.driverId,
      passengerId,
      isInstant
        ? `Instant Booking Confirmed — ${seatsRequested} seat(s), ${luggageSize} bag (${totalFare} EGP simulated paid)`
        : `Booking Requested — ${seatsRequested} seat(s), ${luggageSize} bag (awaiting driver approval)`
    );

    return booking;
  });
}

export async function respondToBooking(
  driverId: string,
  bookingId: string,
  action: "CONFIRMED" | "REJECTED",
  db: PrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });

    if (!booking) {
      throw new ServiceError("Booking not found", 404);
    }
    if (booking.ride.driverId !== driverId) {
      throw new ServiceError("Unauthorized to manage this booking", 403);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new ServiceError("Only pending bookings can be updated", 400);
    }

    if (action === "REJECTED") {
      return tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REJECTED },
      });
    }

    const lockedRide = await lockRideForUpdate(tx, booking.rideId);
    const currentSeats = lockedRide
      ? lockedRide.availableSeats
      : booking.ride.availableSeats;

    if (currentSeats < booking.seatsRequested) {
      throw new ServiceError("Not enough available seats", 409);
    }

    await tx.ride.update({
      where: { id: booking.rideId },
      data: {
        availableSeats: {
          decrement: booking.seatsRequested,
        },
      },
    });

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SIMULATED_PAID,
      },
    });

    await ensureTripChatRoom(
      tx,
      booking.rideId,
      driverId,
      booking.passengerId,
      `Booking Confirmed — ${booking.seatsRequested} seat(s) (${booking.totalFare} EGP simulated paid)`
    );

    return updated;
  });
}

export async function cancelBooking(
  passengerId: string,
  bookingId: string,
  db: PrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new ServiceError("Booking not found", 404);
    }
    if (booking.passengerId !== passengerId) {
      throw new ServiceError("Unauthorized to cancel this booking", 403);
    }
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new ServiceError("Booking cannot be cancelled", 400);
    }

    let promotedStandby = null;

    if (booking.status === BookingStatus.CONFIRMED) {
      const lockedRide = await lockRideForUpdate(tx, booking.rideId);
      const updatedRide = await tx.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: {
            increment: booking.seatsRequested,
          },
        },
      });
      const newAvailable =
        updatedRide?.availableSeats ??
        (lockedRide ? lockedRide.availableSeats + booking.seatsRequested : booking.seatsRequested);

      promotedStandby = await promoteNextStandby(tx, booking.rideId, newAvailable);
    }

    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        paymentStatus:
          booking.status === BookingStatus.CONFIRMED
            ? PaymentStatus.REFUNDED
            : booking.paymentStatus,
        cancelledAt: new Date(),
      },
    });

    return { booking: cancelled, promotedStandby };
  });
}

export async function joinStandbyQueue(
  passengerId: string,
  rideId: string,
  seatsRequested = 1,
  luggageSize: LuggageSizeType = "NONE",
  existingConfirmedBookingId?: string,
  db: PrismaClient = prisma
) {
  if (!Number.isInteger(seatsRequested) || seatsRequested <= 0) {
    throw new ServiceError("Requested seats must be a positive integer", 400);
  }

  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new ServiceError("Ride not found", 404);
  }
  if (ride.status !== RideStatus.OPEN) {
    throw new ServiceError("Ride is not open for standby", 400);
  }
  if (ride.driverId === passengerId) {
    throw new ServiceError("Drivers cannot join standby on their own rides", 400);
  }

  const existing = await db.standbyRequest.findFirst({
    where: {
      rideId,
      passengerId,
      status: { in: [StandbyStatus.WAITING, StandbyStatus.OFFERED] },
    },
  });
  if (existing) {
    throw new ServiceError("You already have an active standby request for this ride", 409);
  }

  return db.standbyRequest.create({
    data: {
      rideId,
      passengerId,
      existingConfirmedBookingId: existingConfirmedBookingId ?? null,
      seatsRequested,
      luggageSize: luggageSize as LuggageSize,
      luggageUnits: getLuggageUnits(luggageSize),
      status: StandbyStatus.WAITING,
    },
  });
}

export async function acceptStandbyOffer(
  passengerId: string,
  standbyId: string,
  db: PrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const standby = await tx.standbyRequest.findUnique({
      where: { id: standbyId },
    });
    if (!standby) {
      throw new ServiceError("Standby request not found", 404);
    }
    if (standby.passengerId !== passengerId) {
      throw new ServiceError("Unauthorized to accept this standby offer", 403);
    }
    if (standby.status !== StandbyStatus.OFFERED) {
      throw new ServiceError("This standby request is not currently offered", 400);
    }

    const targetRide = await lockRideForUpdate(tx, standby.rideId);
    if (!targetRide || targetRide.status !== RideStatus.OPEN) {
      throw new ServiceError("Target ride is no longer open", 400);
    }
    if (targetRide.availableSeats < standby.seatsRequested) {
      throw new ServiceError("Not enough seats remaining to claim standby offer", 409);
    }

    // Cancel existing confirmed booking if linked
    if (standby.existingConfirmedBookingId) {
      const prev = await tx.booking.findUnique({
        where: { id: standby.existingConfirmedBookingId },
      });
      if (prev && prev.passengerId === passengerId && prev.status === BookingStatus.CONFIRMED) {
        const restored = await tx.ride.update({
          where: { id: prev.rideId },
          data: { availableSeats: { increment: prev.seatsRequested } },
        });
        await tx.booking.update({
          where: { id: prev.id },
          data: {
            status: BookingStatus.CANCELLED,
            paymentStatus: PaymentStatus.REFUNDED,
            cancelledAt: new Date(),
          },
        });
        await promoteNextStandby(
          tx,
          prev.rideId,
          restored?.availableSeats ?? prev.seatsRequested
        );
      }
    }

    await tx.ride.update({
      where: { id: standby.rideId },
      data: { availableSeats: { decrement: standby.seatsRequested } },
    });

    const totalFare = targetRide.price * standby.seatsRequested;
    const newBooking = await tx.booking.create({
      data: {
        rideId: standby.rideId,
        passengerId,
        seatsRequested: standby.seatsRequested,
        luggageSize: standby.luggageSize,
        luggageUnits: standby.luggageUnits,
        totalFare,
        paymentStatus: PaymentStatus.SIMULATED_PAID,
        status: BookingStatus.CONFIRMED,
      },
    });

    const promoted = await tx.standbyRequest.update({
      where: { id: standbyId },
      data: { status: StandbyStatus.PROMOTED },
    });

    await ensureTripChatRoom(
      tx,
      standby.rideId,
      targetRide.driverId,
      passengerId,
      `Standby Promoted & Confirmed — ${standby.seatsRequested} seat(s) (${totalFare} EGP simulated paid)`
    );

    return { booking: newBooking, standby: promoted };
  });
}

export async function cancelStandbyRequest(
  passengerId: string,
  standbyId: string,
  db: PrismaClient = prisma
) {
  const standby = await db.standbyRequest.findUnique({
    where: { id: standbyId },
  });
  if (!standby) {
    throw new ServiceError("Standby request not found", 404);
  }
  if (standby.passengerId !== passengerId) {
    throw new ServiceError("Unauthorized", 403);
  }
  return db.standbyRequest.update({
    where: { id: standbyId },
    data: { status: StandbyStatus.CANCELLED },
  });
}

export async function getPassengerBookings(
  passengerId: string,
  db: PrismaClient = prisma
) {
  return db.booking.findMany({
    where: { passengerId },
    orderBy: { createdAt: "desc" },
    include: {
      ride: {
        include: {
          vehicle: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              kycStatus: true,
            },
          },
          reviews: {
            where: { reviewerId: passengerId },
            select: { id: true, rating: true, tags: true, comment: true },
          },
        },
      },
    },
  });
}

export async function getPassengerStandby(
  passengerId: string,
  db: PrismaClient = prisma
) {
  return db.standbyRequest.findMany({
    where: { passengerId },
    orderBy: { createdAt: "desc" },
    include: {
      ride: {
        include: {
          vehicle: true,
          driver: {
            select: { id: true, name: true, kycStatus: true },
          },
        },
      },
    },
  });
}
