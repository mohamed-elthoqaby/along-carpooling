import { describe, expect, it } from "vitest";
import { hashPassword, signToken, verifyPassword, verifyToken } from "@/lib/auth";
import { computeProfileOverview } from "@/lib/overview";

describe("Auth & RBAC Helpers (src/lib/auth.ts) & Profile Overview", () => {
  it("hashes and verifies passwords accurately", async () => {
    const hash = await hashPassword("Password123!");
    expect(await verifyPassword("Password123!", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("signs and verifies JWT payloads for USER and ADMIN roles", async () => {
    const adminToken = await signToken({
      userId: "admin-1",
      email: "admin@along.eg",
      name: "Along Admin",
      role: "ADMIN",
    });
    const decoded = await verifyToken(adminToken);
    expect(decoded?.role).toBe("ADMIN");
    expect(decoded?.email).toBe("admin@along.eg");

    const invalid = await verifyToken("not.a.valid.jwt");
    expect(invalid).toBeNull();
  });

  it("computes deterministic AI Overview from ratings, tags, and completed rides", () => {
    const summary = computeProfileOverview({
      name: "Ahmed Hassan",
      averageRating: 4.9,
      totalReviews: 12,
      completedRides: 15,
      topTags: ["Punctual", "Clean Car"],
      isVerified: true,
    });
    expect(summary).toContain("Ahmed");
    expect(summary).toContain("4.9★");
    expect(summary).toContain("punctual, clean car");
    expect(summary).toContain("Identity-verified");
  });
});
