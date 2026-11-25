import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createChatSchema = z.object({
  rideId: z.string().min(1),
  passengerId: z.string().optional(),
});

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = await prisma.chatRoom.findMany({
    where: {
      OR: [{ driverId: session.userId }, { passengerId: session.userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      ride: {
        select: {
          id: true,
          originName: true,
          destName: true,
          departureTime: true,
          status: true,
        },
      },
      driver: { select: { id: true, name: true, kycStatus: true } },
      passenger: { select: { id: true, name: true, kycStatus: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ rooms });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "rideId is required" }, { status: 400 });
  }

  const ride = await prisma.ride.findUnique({
    where: { id: parsed.data.rideId },
  });
  if (!ride) {
    return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  }

  const passengerId =
    session.userId === ride.driverId
      ? parsed.data.passengerId
      : session.userId;

  if (!passengerId || passengerId === ride.driverId) {
    return NextResponse.json(
      { error: "Cannot open a chat room with yourself" },
      { status: 400 }
    );
  }

  const room = await prisma.chatRoom.upsert({
    where: {
      rideId_driverId_passengerId: {
        rideId: ride.id,
        driverId: ride.driverId,
        passengerId,
      },
    },
    update: {},
    create: {
      rideId: ride.id,
      driverId: ride.driverId,
      passengerId,
    },
  });

  return NextResponse.json({ room }, { status: 201 });
}
