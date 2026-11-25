import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createReview } from "@/services/review.service";
import { ServiceError } from "@/services/ride.service";

const reviewSchema = z.object({
  rideId: z.string().min(1),
  revieweeId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).default([]),
  comment: z.string().trim().min(1, "Comment is required"),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid review input" },
        { status: 400 }
      );
    }

    const review = await createReview(
      session.userId,
      parsed.data.rideId,
      parsed.data.rating,
      parsed.data.comment,
      parsed.data.tags,
      parsed.data.revieweeId
    );
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
