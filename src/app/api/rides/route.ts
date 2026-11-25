import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createRide, ServiceError } from "@/services/ride.service";

const createRideSchema = z.object({
  vehicleId: z.string().optional(),
  originName: z.string().trim().min(1),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destName: z.string().trim().min(1),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
  departureTime: z.string().min(1),
  estimatedArrivalTime: z.string().optional(),
  totalSeats: z.number().int().positive(),
  price: z.number().min(0),
  instantBooking: z.boolean().optional(),
  liveLocationSharingEnabled: z.boolean().optional(),
  maxLuggageUnits: z.number().int().min(0).max(20).optional(),
  amenities: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createRideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid ride input" },
        { status: 400 }
      );
    }

    const ride = await createRide(session.userId, parsed.data);
    return NextResponse.json({ ride }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Create ride error:", error);
    return NextResponse.json(
      { error: "Failed to publish ride" },
      { status: 500 }
    );
  }
}
