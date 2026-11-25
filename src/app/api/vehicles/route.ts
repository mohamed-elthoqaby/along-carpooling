import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const vehicleSchema = z.object({
  make: z.string().trim().min(1, "Vehicle make is required"),
  model: z.string().trim().min(1, "Vehicle model is required"),
  year: z.number().int().min(1990).max(2030).default(2022),
  color: z.string().trim().min(1, "Color is required"),
  plateNumber: z.string().trim().min(2, "Plate number is required"),
  maxPassengerSeats: z.number().int().min(1).max(8).default(4),
  trunkDescription: z.string().trim().min(2).max(200).default("Standard trunk"),
  maxLuggageUnits: z.number().int().min(0).max(20).default(6),
});

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { driverId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid vehicle data" },
      { status: 400 }
    );
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      driverId: session.userId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
