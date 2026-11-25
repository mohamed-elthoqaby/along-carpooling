import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const kycSchema = z.object({
  kycIdNumber: z.string().trim().min(6, "Valid ID number is required"),
  kycNote: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = kycSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid KYC submission" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      kycStatus: "PENDING",
      kycIdNumber: parsed.data.kycIdNumber,
      kycNote: parsed.data.kycNote ?? "",
    },
    select: {
      id: true,
      kycStatus: true,
      kycIdNumber: true,
      kycNote: true,
    },
  });

  return NextResponse.json({ user });
}
