import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [usersCount, ridesCount, bookingsCount] = await Promise.all([
    prisma.user.count(),
    prisma.ride.count(),
    prisma.booking.count(),
  ]);

  return NextResponse.json({
    stats: {
      users: usersCount,
      rides: ridesCount,
      bookings: bookingsCount,
    },
  });
}
