import {
  BookingStatus,
  KycStatus,
  PrismaClient,
  RideStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getH3Index, getNearbyH3Cells } from "@/lib/h3";

export interface CreateRideInput {
  vehicleId?: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  departureTime: string | Date;
  estimatedArrivalTime?: string | Date;
  totalSeats: number;
  price: number;
  instantBooking?: boolean;
  liveLocationSharingEnabled?: boolean;
  maxLuggageUnits?: number;
  amenities?: string[];
}

export interface SearchRidesInput {
  lat?: number;
  lng?: number;
  ringSize?: number;
  originQuery?: string;
  destinationQuery?: string;
  date?: string;
  passengers?: number;
  minHour?: number;
  maxHour?: number;
  amenities?: string[];
  verifiedOnly?: boolean;
  sort?: "earliest" | "lowest_price" | "highest_rating";
  includeFull?: boolean;
}

export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

export async function createRide(
  driverId: string,
  data: CreateRideInput,
  db: PrismaClient = prisma
) {
  if (!Number.isInteger(data.totalSeats) || data.totalSeats <= 0) {
    throw new ServiceError("Total seats must be a positive integer", 400);
  }
  if (typeof data.price !== "number" || data.price < 0) {
    throw new ServiceError("Price must be 0 or greater", 400);
  }
  if (!data.originName.trim() || !data.destName.trim()) {
    throw new ServiceError("Origin and destination names are required", 400);
  }

  const departure = new Date(data.departureTime);
  if (Number.isNaN(departure.getTime())) {
    throw new ServiceError("Invalid departure time", 400);
  }
  if (departure.getTime() < Date.now() - 60_000) {
    throw new ServiceError("Departure time must be in the future", 400);
  }

  let maxLuggageUnits = data.maxLuggageUnits ?? 6;
  if (data.vehicleId) {
    const vehicle = await db.vehicle.findUnique({
      where: { id: data.vehicleId },
    });
    if (!vehicle || vehicle.driverId !== driverId) {
      throw new ServiceError("Selected vehicle not found", 404);
    }
    if (data.totalSeats > vehicle.maxPassengerSeats) {
      throw new ServiceError(
        `Seats cannot exceed vehicle capacity (${vehicle.maxPassengerSeats})`,
        400
      );
    }
    if (data.maxLuggageUnits === undefined) {
      maxLuggageUnits = vehicle.maxLuggageUnits;
    }
  }

  const amenities = Array.isArray(data.amenities) ? data.amenities : [];
  const instantBooking =
    Boolean(data.instantBooking) || amenities.includes("Instant booking");

  const originH3Index = getH3Index(data.originLat, data.originLng);
  const estimatedArrival = data.estimatedArrivalTime
    ? new Date(data.estimatedArrivalTime)
    : new Date(departure.getTime() + 90 * 60 * 1000);

  return db.ride.create({
    data: {
      driverId,
      vehicleId: data.vehicleId ?? null,
      originName: data.originName.trim(),
      originLat: data.originLat,
      originLng: data.originLng,
      originH3Index,
      destName: data.destName.trim(),
      destLat: data.destLat,
      destLng: data.destLng,
      departureTime: departure,
      estimatedArrivalTime: estimatedArrival,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats,
      price: data.price,
      instantBooking,
      liveLocationSharingEnabled: Boolean(data.liveLocationSharingEnabled),
      maxLuggageUnits,
      amenities,
      status: RideStatus.OPEN,
    },
  });
}

export async function updateRideStatus(
  rideId: string,
  driverId: string,
  status: "COMPLETED" | "CANCELLED",
  db: PrismaClient = prisma
) {
  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new ServiceError("Ride not found", 404);
  }
  if (ride.driverId !== driverId) {
    throw new ServiceError("You are not authorized to update this ride", 403);
  }
  if (ride.status !== RideStatus.OPEN) {
    throw new ServiceError("Only OPEN rides can be updated", 400);
  }

  return db.ride.update({
    where: { id: rideId },
    data: { status },
  });
}

export async function getDriverRides(
  driverId: string,
  db: PrismaClient = prisma
) {
  return db.ride.findMany({
    where: { driverId },
    orderBy: { departureTime: "desc" },
    include: {
      vehicle: true,
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          passenger: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              kycStatus: true,
            },
          },
        },
      },
      standbyRequests: {
        orderBy: { createdAt: "asc" },
        include: {
          passenger: {
            select: { id: true, name: true, kycStatus: true },
          },
        },
      },
    },
  });
}

export async function getRideById(rideId: string, db: PrismaClient = prisma) {
  const ride = await db.ride.findUnique({
    where: { id: rideId },
    include: {
      vehicle: true,
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          bio: true,
          kycStatus: true,
          reviewsReceived: {
            orderBy: { createdAt: "desc" },
            include: {
              reviewer: { select: { id: true, name: true, kycStatus: true } },
            },
          },
        },
      },
      bookings: {
        where: { status: BookingStatus.CONFIRMED },
        select: { id: true, passengerId: true, seatsRequested: true, luggageUnits: true },
      },
      standbyRequests: {
        where: { status: { in: ["WAITING", "OFFERED"] } },
        select: { id: true, passengerId: true, status: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!ride) {
    throw new ServiceError("Ride not found", 404);
  }

  const received = ride.driver.reviewsReceived;
  const averageRating =
    received.length > 0
      ? Number(
          (
            received.reduce((sum, r) => sum + r.rating, 0) / received.length
          ).toFixed(1)
        )
      : null;

  const usedLuggageUnits = ride.bookings.reduce(
    (sum, b) => sum + (b.luggageUnits ?? 0),
    0
  );

  return {
    ...ride,
    usedLuggageUnits,
    standbyCount: ride.standbyRequests.length,
    driverAverageRating: averageRating,
    driverReviewCount: received.length,
  };
}

export async function findNearbyRides(
  input: SearchRidesInput,
  db: PrismaClient = prisma
) {
  const whereClause: Record<string, unknown> = {
    status: RideStatus.OPEN,
  };

  if (!input.includeFull) {
    whereClause.availableSeats = { gte: Math.max(1, input.passengers ?? 1) };
  }

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    const ringSize = Math.min(Math.max(input.ringSize ?? 2, 0), 4);
    const cells = getNearbyH3Cells(input.lat, input.lng, ringSize);
    whereClause.originH3Index = { in: cells };
  }

  if (input.originQuery?.trim()) {
    whereClause.originName = {
      contains: input.originQuery.trim(),
      mode: "insensitive",
    };
  }

  if (input.destinationQuery?.trim()) {
    whereClause.destName = {
      contains: input.destinationQuery.trim(),
      mode: "insensitive",
    };
  }

  if (input.date?.trim()) {
    const start = new Date(`${input.date}T00:00:00.000Z`);
    const end = new Date(`${input.date}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime())) {
      whereClause.departureTime = { gte: start, lte: end };
    }
  }

  if (input.verifiedOnly) {
    whereClause.driver = { kycStatus: KycStatus.VERIFIED };
  }

  if (input.amenities && input.amenities.length > 0) {
    whereClause.amenities = { hasEvery: input.amenities };
  }

  const rides = await db.ride.findMany({
    where: whereClause,
    orderBy:
      input.sort === "lowest_price"
        ? { price: "asc" }
        : { departureTime: "asc" },
    include: {
      vehicle: true,
      driver: {
        select: {
          id: true,
          name: true,
          kycStatus: true,
          reviewsReceived: { select: { rating: true } },
        },
      },
      bookings: {
        where: { status: BookingStatus.CONFIRMED },
        select: { luggageUnits: true },
      },
    },
  });

  let mapped = rides.map((ride) => {
    const ratings = ride.driver.reviewsReceived;
    const averageRating =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
            ).toFixed(1)
          )
        : null;
    const usedLuggageUnits = ride.bookings.reduce(
      (sum, b) => sum + (b.luggageUnits ?? 0),
      0
    );
    return {
      ...ride,
      usedLuggageUnits,
      driverAverageRating: averageRating,
      driverReviewCount: ratings.length,
    };
  });

  // Optional departure hour window filter
  if (typeof input.minHour === "number" || typeof input.maxHour === "number") {
    const minH = input.minHour ?? 0;
    const maxH = input.maxHour ?? 23;
    mapped = mapped.filter((r) => {
      const h = new Date(r.departureTime).getHours();
      return h >= minH && h <= maxH;
    });
  }

  if (input.sort === "highest_rating") {
    mapped.sort(
      (a, b) => (b.driverAverageRating ?? 0) - (a.driverAverageRating ?? 0)
    );
  }

  return { rides: mapped };
}
