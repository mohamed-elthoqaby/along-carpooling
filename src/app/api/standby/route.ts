import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { joinStandbyQueue } from "@/services/booking.service";
import { ServiceError } from "@/services/ride.service";

const standbySchema = z.object({
  rideId: z.string().min(1),
  seatsRequested: z.number().int().positive().default(1),
  luggageSize: z.enum(["NONE", "SMALL", "MEDIUM", "LARGE"]).default("NONE"),
  existingConfirmedBookingId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = standbySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid standby request" },
        { status: 400 }
      );
    }

    const standby = await joinStandbyQueue(
      session.userId,
      parsed.data.rideId,
      parsed.data.seatsRequested,
      parsed.data.luggageSize,
      parsed.data.existingConfirmedBookingId
    );
    return NextResponse.json({ standby }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to join standby queue" },
      { status: 500 }
    );
  }
}
