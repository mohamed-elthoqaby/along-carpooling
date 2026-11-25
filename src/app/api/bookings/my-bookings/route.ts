import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getPassengerBookings,
  getPassengerStandby,
} from "@/services/booking.service";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bookings, standbyRequests] = await Promise.all([
    getPassengerBookings(session.userId),
    getPassengerStandby(session.userId),
  ]);

  return NextResponse.json({ bookings, standbyRequests });
}
