import { NextResponse } from "next/server";
import { BookingStatus, RideStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeProfileOverview } from "@/lib/overview";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      role: true,
      isBanned: true,
      kycStatus: true,
      kycIdNumber: true,
      kycNote: true,
      createdAt: true,
      vehicles: { orderBy: { createdAt: "desc" } },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true, kycStatus: true } },
        },
      },
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const [completedDriven, completedBooked] = await Promise.all([
    prisma.ride.count({
      where: { driverId: user.id, status: RideStatus.COMPLETED },
    }),
    prisma.booking.count({
      where: {
        passengerId: user.id,
        status: BookingStatus.CONFIRMED,
        ride: { status: RideStatus.COMPLETED },
      },
    }),
  ]);

  const completedRides = completedDriven + completedBooked;
  const totalReviews = user.reviewsReceived.length;
  const averageRating =
    totalReviews > 0
      ? Number(
          (
            user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) /
            totalReviews
          ).toFixed(1)
        )
      : null;

  const tagCounts = new Map<string, number>();
  for (const r of user.reviewsReceived) {
    for (const t of r.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const aiOverview = computeProfileOverview({
    name: user.name,
    averageRating,
    totalReviews,
    completedRides,
    topTags,
    isVerified: user.kycStatus === "VERIFIED",
  });

  return NextResponse.json({
    user: {
      ...user,
      stats: {
        completedRides,
        averageRating,
        totalReviews,
        reliabilityPct: completedRides > 0 ? 98 : 100,
      },
      topTags,
      aiOverview,
    },
  });
}
