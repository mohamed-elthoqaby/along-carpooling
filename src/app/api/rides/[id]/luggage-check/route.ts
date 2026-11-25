import { NextRequest, NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  evaluateLuggageFit,
  getLuggageUnits,
  LuggageSizeType,
} from "@/lib/luggage";

const luggageCheckSchema = z.object({
  luggageSize: z.enum(["NONE", "SMALL", "MEDIUM", "LARGE"]),
  seatsRequested: z.number().int().positive().default(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = luggageCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid luggage size" },
        { status: 400 }
      );
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: BookingStatus.CONFIRMED },
          select: { luggageUnits: true },
        },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const usedUnits = ride.bookings.reduce(
      (sum, b) => sum + (b.luggageUnits ?? 0),
      0
    );
    const requestedUnits =
      getLuggageUnits(parsed.data.luggageSize as LuggageSizeType) *
      parsed.data.seatsRequested;

    const fit = evaluateLuggageFit(
      usedUnits,
      requestedUnits,
      ride.maxLuggageUnits
    );

    return NextResponse.json({ fit });
  } catch (error) {
    console.error("Luggage check error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate luggage fit" },
      { status: 500 }
    );
  }
}
