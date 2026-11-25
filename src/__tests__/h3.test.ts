import { describe, expect, it } from "vitest";
import { getH3Index, getNearbyH3Cells, H3_RESOLUTION } from "@/lib/h3";

describe("Uber H3 Backend Spatial Index (src/lib/h3.ts)", () => {
  const zagazigLat = 30.5877;
  const zagazigLng = 31.502;

  it("computes a valid Resolution-7 H3 cell index", () => {
    expect(H3_RESOLUTION).toBe(7);
    const cell = getH3Index(zagazigLat, zagazigLng);
    expect(typeof cell).toBe("string");
    expect(cell.length).toBe(15);
  });

  it("returns exact gridDisk ring cell counts for k=0 (1), k=1 (7), k=2 (19)", () => {
    expect(new Set(getNearbyH3Cells(zagazigLat, zagazigLng, 0)).size).toBe(1);
    expect(new Set(getNearbyH3Cells(zagazigLat, zagazigLng, 1)).size).toBe(7);
    expect(new Set(getNearbyH3Cells(zagazigLat, zagazigLng, 2)).size).toBe(19);
  });

  it("includes a nearby point (~2 km away) within k=1", () => {
    const nearbyCell = getH3Index(30.5945, 31.491);
    const searchCells = getNearbyH3Cells(zagazigLat, zagazigLng, 1);
    expect(searchCells).toContain(nearbyCell);
  });

  it("excludes a distant city (Alexandria) from Zagazig k=2", () => {
    const alexandriaCell = getH3Index(31.2194, 29.9416);
    const searchCells = getNearbyH3Cells(zagazigLat, zagazigLng, 2);
    expect(searchCells).not.toContain(alexandriaCell);
  });
});
