import { gridDisk, latLngToCell } from "h3-js";

export const H3_RESOLUTION = 7;

/**
 * Converts a (lat, lng) coordinate pair to a Resolution-7 Uber H3 cell index.
 * Stored as a B-Tree indexed string column (originH3Index) in PostgreSQL.
 */
export function getH3Index(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Returns the H3 cell index at (lat, lng) plus all neighboring cells within ringSize k.
 * k = 0 -> 1 cell, k = 1 -> 7 cells, k = 2 -> 19 cells.
 */
export function getNearbyH3Cells(
  lat: number,
  lng: number,
  ringSize = 1
): string[] {
  const centerCell = getH3Index(lat, lng);
  return gridDisk(centerCell, ringSize);
}
