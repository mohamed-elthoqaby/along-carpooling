import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminUserPatchSchema = z.object({
  toggleBan: z.boolean().optional(),
  kycStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = { toggleBan: true };
  }

  const parsed = adminUserPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.kycStatus) {
    data.kycStatus = parsed.data.kycStatus;
  }
  if (parsed.data.toggleBan || (!parsed.data.kycStatus && Object.keys(body).length === 0)) {
    if (id === session.userId) {
      return NextResponse.json(
        { error: "Admin cannot ban themselves" },
        { status: 400 }
      );
    }
    data.isBanned = !target.isBanned;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      kycStatus: true,
    },
  });

  return NextResponse.json({ user });
}
