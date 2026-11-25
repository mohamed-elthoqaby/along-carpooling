import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { cancelBooking, respondToBooking } from "@/services/booking.service";
import { ServiceError } from "@/services/ride.service";

const patchBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = patchBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid action" },
        { status: 400 }
      );
    }

    if (parsed.data.status === "CANCELLED") {
      const result = await cancelBooking(session.userId, id);
      return NextResponse.json(result);
    }

    const booking = await respondToBooking(
      session.userId,
      id,
      parsed.data.status
    );
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
