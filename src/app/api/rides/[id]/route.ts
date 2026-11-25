import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getRideById,
  ServiceError,
  updateRideStatus,
} from "@/services/ride.service";
import { prisma } from "@/lib/prisma";

const patchRideSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED"]).optional(),
  liveLocationSharingEnabled: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ride = await getRideById(id);
    return NextResponse.json({ ride });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json({ error: "Failed to load ride" }, { status: 500 });
  }
}

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
    const parsed = patchRideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    if (parsed.data.status) {
      const ride = await updateRideStatus(id, session.userId, parsed.data.status);
      return NextResponse.json({ ride });
    }

    if (typeof parsed.data.liveLocationSharingEnabled === "boolean") {
      const existing = await prisma.ride.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Ride not found" }, { status: 404 });
      }
      if (existing.driverId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const ride = await prisma.ride.update({
        where: { id },
        data: {
          liveLocationSharingEnabled: parsed.data.liveLocationSharingEnabled,
        },
      });
      return NextResponse.json({ ride });
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to update ride" },
      { status: 500 }
    );
  }
}
