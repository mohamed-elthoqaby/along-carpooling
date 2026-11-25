import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const savedSearchSchema = z.object({
  originName: z.string().trim().min(1),
  originLat: z.number().default(30.5877),
  originLng: z.number().default(31.502),
  destName: z.string().trim().min(1),
  destLat: z.number().default(30.0626),
  destLng: z.number().default(31.2469),
});

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ savedSearches: [] });
  }

  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return NextResponse.json({ savedSearches });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = savedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search route" }, { status: 400 });
  }

  const saved = await prisma.savedSearch.create({
    data: {
      userId: session.userId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ savedSearch: saved }, { status: 201 });
}
