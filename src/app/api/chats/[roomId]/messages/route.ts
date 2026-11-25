import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(1000),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await context.params;
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
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
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
  }
  if (
    room.driverId !== session.userId &&
    room.passengerId !== session.userId &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ room, messages });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await context.params;
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
  }
  if (room.driverId !== session.userId && room.passengerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message" },
      { status: 400 }
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: session.userId,
      body: parsed.data.body,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
