import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requestBooking } from "@/services/booking.service";
import { ServiceError } from "@/services/ride.service";

const createBookingSchema = z.object({
  rideId: z.string().min(1),
  seatsRequested: z.number().int().positive().default(1),
  luggageSize: z.enum(["NONE", "SMALL", "MEDIUM", "LARGE"]).default("NONE"),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid booking input" },
        { status: 400 }
      );
    }

    const booking = await requestBooking(
      session.userId,
      parsed.data.rideId,
      parsed.data.seatsRequested,
      parsed.data.luggageSize
    );
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Failed to request booking" },
      { status: 500 }
    );
  }
}
