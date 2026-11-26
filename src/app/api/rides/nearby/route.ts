import { NextRequest, NextResponse } from "next/server";
import { findNearbyRides } from "@/services/ride.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const kStr = searchParams.get("k");
  const origin = searchParams.get("origin") ?? undefined;
  const dest = searchParams.get("dest") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const passengersStr = searchParams.get("passengers");
  const minHourStr = searchParams.get("minHour");
  const maxHourStr = searchParams.get("maxHour");
  const amenitiesStr = searchParams.get("amenities");
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const includeFull = searchParams.get("includeFull") === "true";
  const sort = searchParams.get("sort") as
    | "earliest"
    | "lowest_price"
    | "highest_rating"
    | null;

  let lat: number | undefined;
  let lng: number | undefined;

  if (latStr && lngStr) {
    const parsedLat = Number(latStr);
    const parsedLng = Number(lngStr);
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return NextResponse.json(
        { error: "Invalid lat/lng coordinates" },
        { status: 400 }
      );
    }
    lat = parsedLat;
    lng = parsedLng;
  }

  try {
    const result = await findNearbyRides({
      lat,
      lng,
      ringSize: kStr ? Number(kStr) : 2,
      originQuery: origin,
      destinationQuery: dest,
      date,
      passengers: passengersStr ? Number(passengersStr) : 1,
      minHour: minHourStr ? Number(minHourStr) : undefined,
      maxHour: maxHourStr ? Number(maxHourStr) : undefined,
      amenities: amenitiesStr
        ? amenitiesStr.split(",").filter(Boolean)
        : undefined,
      verifiedOnly,
      includeFull,
      sort: sort ?? "earliest",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Nearby rides error:", error);
    const detail =
      error instanceof Error ? error.message : "Failed to search rides";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
