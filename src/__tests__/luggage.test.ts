import { describe, expect, it } from "vitest";
import { evaluateLuggageFit, getLuggageUnits } from "@/lib/luggage";

describe("Smart Luggage Fit Check (src/lib/luggage.ts)", () => {
  it("maps luggage tiers to exact units (NONE=0, SMALL=1, MEDIUM=2, LARGE=3)", () => {
    expect(getLuggageUnits("NONE")).toBe(0);
    expect(getLuggageUnits("SMALL")).toBe(1);
    expect(getLuggageUnits("MEDIUM")).toBe(2);
    expect(getLuggageUnits("LARGE")).toBe(3);
  });

  it("returns FITS_COMFORTABLY when utilization <= 80%", () => {
    const result = evaluateLuggageFit(2, 2, 5); // 4/5 = 80%
    expect(result.status).toBe("FITS_COMFORTABLY");
    expect(result.utilizationPct).toBe(80);
  });

  it("returns TIGHT_FIT when utilization is between 81% and 100%", () => {
    const result = evaluateLuggageFit(3, 2, 6); // 5/6 = 83.3%
    expect(result.status).toBe("TIGHT_FIT");
    expect(result.utilizationPct).toBe(83);

    const exactFull = evaluateLuggageFit(3, 3, 6); // 6/6 = 100%
    expect(exactFull.status).toBe("TIGHT_FIT");
    expect(exactFull.utilizationPct).toBe(100);
  });

  it("returns EXCEEDS_CAPACITY when utilization > 100%", () => {
    const result = evaluateLuggageFit(4, 3, 6); // 7/6 = 117%
    expect(result.status).toBe("EXCEEDS_CAPACITY");
    expect(result.utilizationPct).toBe(117);
  });
});
