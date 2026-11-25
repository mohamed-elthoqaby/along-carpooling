export interface ProfileOverviewInput {
  name: string;
  averageRating: number | null;
  totalReviews: number;
  completedRides: number;
  topTags: string[];
  isVerified: boolean;
}

/**
 * Deterministic summary generator for the Along "AI Overview" card.
 * Computed purely from verified ride history, average rating, and review tags.
 */
export function computeProfileOverview(input: ProfileOverviewInput): string {
  const firstName = input.name.trim().split(/\s+/)[0] || "This member";

  if (input.totalReviews === 0 && input.completedRides === 0) {
    return `${firstName} is new to Along${
      input.isVerified ? " with a verified government ID" : ""
    }. Complete trips and collect feedback to build a community reputation summary.`;
  }

  const ratingPhrase =
    input.averageRating !== null
      ? `maintains a ${input.averageRating.toFixed(1)}★ rating across ${input.totalReviews} review${
          input.totalReviews === 1 ? "" : "s"
        }`
      : `has completed ${input.completedRides} trip${input.completedRides === 1 ? "" : "s"}`;

  const tagsPhrase =
    input.topTags.length > 0
      ? ` Fellow commuters frequently highlight ${input.topTags
          .slice(0, 3)
          .join(", ")
          .toLowerCase()}.`
      : "";

  const verifiedPhrase = input.isVerified
    ? " Identity-verified commuter on Along."
    : "";

  return `${firstName} ${ratingPhrase} with ${input.completedRides} completed carpool trip${
    input.completedRides === 1 ? "" : "s"
  }.${tagsPhrase}${verifiedPhrase}`;
}
