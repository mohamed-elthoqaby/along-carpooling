import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(6).optional(),
  bio: z.string().trim().max(400).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile data" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      kycStatus: true,
    },
  });

  return NextResponse.json({ user });
}
