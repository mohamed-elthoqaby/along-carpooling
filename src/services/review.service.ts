import { BookingStatus, PrismaClient, RideStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/ride.service";

export async function createReview(
  reviewerId: string,
  rideId: string,
  rating: number,
  comment: string,
  tags: string[] = [],
  revieweeId?: string,
  db: PrismaClient = prisma
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ServiceError("Rating must be an integer between 1 and 5", 400);
  }
  if (!comment.trim()) {
    throw new ServiceError("Review comment is required", 400);
  }

  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new ServiceError("Ride not found", 404);
  }
  if (ride.status !== RideStatus.COMPLETED) {
    throw new ServiceError(
      "Reviews can only be submitted for completed rides",
      400
    );
  }

  let targetUserId = revieweeId ?? ride.driverId;

  if (reviewerId === ride.driverId) {
    // Driver reviewing a confirmed passenger
    if (!revieweeId || revieweeId === ride.driverId) {
      throw new ServiceError("Select a passenger to review", 400);
    }
    const passengerBooking = await db.booking.findFirst({
      where: {
        rideId,
        passengerId: revieweeId,
        status: BookingStatus.CONFIRMED,
      },
    });
    if (!passengerBooking) {
      throw new ServiceError(
        "You can only review passengers with a confirmed booking on this ride",
        403
      );
    }
    targetUserId = revieweeId;
  } else {
    // Passenger reviewing the driver
    const confirmedBooking = await db.booking.findFirst({
      where: {
        rideId,
        passengerId: reviewerId,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (!confirmedBooking) {
      throw new ServiceError(
        "Only passengers with a confirmed booking can review this ride",
        403
      );
    }
    targetUserId = ride.driverId;
  }

  const existing = await db.review.findFirst({
    where: { rideId, reviewerId, revieweeId: targetUserId },
  });
  if (existing) {
    throw new ServiceError("You have already reviewed this trip", 409);
  }

  return db.review.create({
    data: {
      rideId,
      reviewerId,
      revieweeId: targetUserId,
      rating,
      tags,
      comment: comment.trim(),
    },
  });
}
