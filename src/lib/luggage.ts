export type LuggageSizeType = "NONE" | "SMALL" | "MEDIUM" | "LARGE";

export const LUGGAGE_UNITS: Record<LuggageSizeType, number> = {
  NONE: 0,
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

export type LuggageFitStatus =
  | "FITS_COMFORTABLY"
  | "TIGHT_FIT"
  | "EXCEEDS_CAPACITY";

export interface LuggageFitResult {
  status: LuggageFitStatus;
  usedUnits: number;
  requestedUnits: number;
  totalUnits: number;
  maxUnits: number;
  utilizationPct: number;
  message: string;
}

export function getLuggageUnits(size: LuggageSizeType): number {
  return LUGGAGE_UNITS[size] ?? 0;
}

/**
 * Evaluates luggage trunk utilization against ride capacity.
 * <= 80% -> FITS_COMFORTABLY
 * 81% - 100% -> TIGHT_FIT
 * > 100% -> EXCEEDS_CAPACITY
 */
export function evaluateLuggageFit(
  usedUnits: number,
  requestedUnits: number,
  maxUnits: number
): LuggageFitResult {
  const safeUsed = Math.max(0, usedUnits);
  const safeRequested = Math.max(0, requestedUnits);
  const totalUnits = safeUsed + safeRequested;

  if (maxUnits <= 0) {
    return {
      status: totalUnits === 0 ? "FITS_COMFORTABLY" : "EXCEEDS_CAPACITY",
      usedUnits: safeUsed,
      requestedUnits: safeRequested,
      totalUnits,
      maxUnits: 0,
      utilizationPct: totalUnits === 0 ? 0 : 101,
      message:
        totalUnits === 0
          ? "No luggage selected — ready to ride."
          : "This vehicle has no available trunk capacity for luggage.",
    };
  }

  const ratio = (totalUnits / maxUnits) * 100;
  const utilizationPct = Math.round(ratio);

  if (ratio <= 80) {
    return {
      status: "FITS_COMFORTABLY",
      usedUnits: safeUsed,
      requestedUnits: safeRequested,
      totalUnits,
      maxUnits,
      utilizationPct,
      message: `Fits comfortably (${totalUnits}/${maxUnits} trunk units used).`,
    };
  }

  if (ratio <= 100) {
    return {
      status: "TIGHT_FIT",
      usedUnits: safeUsed,
      requestedUnits: safeRequested,
      totalUnits,
      maxUnits,
      utilizationPct,
      message: `Tight fit (${totalUnits}/${maxUnits} trunk units). Consider confirming with the driver in chat.`,
    };
  }

  return {
    status: "EXCEEDS_CAPACITY",
    usedUnits: safeUsed,
    requestedUnits: safeRequested,
    totalUnits,
    maxUnits,
    utilizationPct,
    message: `Exceeds trunk capacity (${totalUnits}/${maxUnits} units). Choose a smaller bag or message the driver.`,
  };
}
