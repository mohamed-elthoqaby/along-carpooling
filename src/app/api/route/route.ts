import { NextRequest, NextResponse } from "next/server";

interface CachedRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

const routeCache = new Map<string, CachedRoute>();

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const originLat = Number(searchParams.get("originLat"));
  const originLng = Number(searchParams.get("originLng"));
  const destLat = Number(searchParams.get("destLat"));
  const destLng = Number(searchParams.get("destLng"));

  if (
    [originLat, originLng, destLat, destLng].some(
      (n) => Number.isNaN(n) || !Number.isFinite(n)
    )
  ) {
    return NextResponse.json(
      { error: "Valid originLat, originLng, destLat, destLng are required" },
      { status: 400 }
    );
  }

  const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const fallbackDistance = Number(
    haversineKm(originLat, originLng, destLat, destLng).toFixed(1)
  );
  const fallback: CachedRoute = {
    coordinates: [
      [originLng, originLat],
      [destLng, destLat],
    ],
    distanceKm: fallbackDistance,
    durationMin: Math.max(5, Math.round((fallbackDistance / 65) * 60)),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(fallback);
    }

    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates;

    if (!Array.isArray(coords) || coords.length < 2) {
      return NextResponse.json(fallback);
    }

    const result: CachedRoute = {
      coordinates: coords as [number, number][],
      distanceKm: Number(((route.distance ?? 0) / 1000).toFixed(1)),
      durationMin: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    };

    routeCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(fallback);
  } finally {
    clearTimeout(timeout);
  }
}
