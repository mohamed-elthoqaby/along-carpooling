import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDriverRides } from "@/services/ride.service";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rides = await getDriverRides(session.userId);
  return NextResponse.json({ rides });
}
