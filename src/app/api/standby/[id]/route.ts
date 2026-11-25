import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  acceptStandbyOffer,
  cancelStandbyRequest,
} from "@/services/booking.service";
import { ServiceError } from "@/services/ride.service";

const patchStandbySchema = z.object({
  action: z.enum(["ACCEPT", "CANCEL"]),
});

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
    const parsed = patchStandbySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (parsed.data.action === "ACCEPT") {
      const result = await acceptStandbyOffer(session.userId, id);
      return NextResponse.json(result);
    }

    const standby = await cancelStandbyRequest(session.userId, id);
    return NextResponse.json({ standby });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to update standby request" },
      { status: 500 }
    );
  }
}
