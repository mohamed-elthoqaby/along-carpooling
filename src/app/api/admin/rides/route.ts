import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rides = await prisma.ride.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      driver: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ rides });
}
