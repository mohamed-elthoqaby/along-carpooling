"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageCircle,
  Radio,
  Star,
  Zap,
} from "lucide-react";
import { AlongMap } from "@/components/map/AlongMap";
import type { LuggageFitResult, LuggageSizeType } from "@/lib/luggage";

interface RideDetail {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  departureTime: string;
  estimatedArrivalTime: string | null;
  totalSeats: number;
  availableSeats: number;
  price: number;
  instantBooking: boolean;
  liveLocationSharingEnabled: boolean;
  maxLuggageUnits: number;
  usedLuggageUnits: number;
  standbyCount: number;
  amenities: string[];
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  driverAverageRating: number | null;
  driverReviewCount: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    trunkDescription: string;
    maxLuggageUnits: number;
  } | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    bio: string;
    kycStatus: string;
    reviewsReceived: Array<{
      id: string;
      rating: number;
      tags: string[];
      comment: string;
      createdAt: string;
      reviewer: { id: string; name: string };
    }>;
  };
}

const LUGGAGE_OPTIONS: Array<{
  size: LuggageSizeType;
  label: string;
  hint: string;
  units: number;
}> = [
  { size: "NONE", label: "No Bag", hint: "Personal item only", units: 0 },
  { size: "SMALL", label: "Small", hint: "Backpack / tote (1u)", units: 1 },
  { size: "MEDIUM", label: "Medium", hint: "Carry-on (2u)", units: 2 },
  { size: "LARGE", label: "Large", hint: "Checked bag (3u)", units: 3 },
];

const REVIEW_TAGS = [
  "Punctual",
  "Clean Car",
  "Safe Driving",
  "Friendly",
  "Comfortable",
];

function RideDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [luggageSize, setLuggageSize] = useState<LuggageSizeType>("SMALL");
  const [luggageFit, setLuggageFit] = useState<LuggageFitResult | null>(null);

  const [bookingMsg, setBookingMsg] = useState("");
  const [bookingErr, setBookingErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Punctual"]);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewErr, setReviewErr] = useState("");

  const loadRide = useCallback(async () => {
    const res = await fetch(`/api/rides/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRide(data.ride);
    }
  }, [id]);

  useEffect(() => {
    loadRide();
  }, [loadRide]);

  // Live Smart Luggage Fit Check
  useEffect(() => {
    if (!ride) return;
    fetch(`/api/rides/${id}/luggage-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ luggageSize, seatsRequested }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.fit) setLuggageFit(data.fit);
      })
      .catch(() => {});
  }, [id, ride, luggageSize, seatsRequested]);

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    setBookingErr("");
    setBookingMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: id, seatsRequested, luggageSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        setBookingErr(data.error || "Booking failed");
        return;
      }
      setBookingMsg(
        data.booking.status === "CONFIRMED"
          ? "Instant Booking Confirmed! Simulated payment completed & trip chat opened."
          : "Booking request submitted! Waiting for driver approval."
      );
      loadRide();
    } catch {
      setBookingErr("Network error while booking");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinStandby() {
    setBookingErr("");
    setBookingMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/standby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: id, seatsRequested, luggageSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        setBookingErr(data.error || "Could not join standby queue");
        return;
      }
      setBookingMsg(
        "Joined Standby Queue (WAITING). If a seat opens, you'll receive an offer in Your Rides!"
      );
      loadRide();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenChat() {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId: id }),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      router.push(`/chat?roomId=${data.room.id}`);
    }
  }

  async function handleReview(e: FormEvent) {
    e.preventDefault();
    setReviewErr("");
    setReviewMsg("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rideId: id,
        rating,
        tags: selectedTags,
        comment,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setReviewErr(data.error || "Could not submit review");
      return;
    }
    setReviewMsg("Review published! Thank you for helping the Along community.");
    setComment("");
    loadRide();
  }

  if (!ride) {
    return (
      <p className="py-10 text-center text-sm text-[#5E6878]">
        Loading ride details...
      </p>
    );
  }

  const isFull = ride.availableSeats <= 0;

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <div className="along-card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E9EEF5] px-2.5 py-0.5 text-xs font-semibold text-[#050412]">
              {ride.status}
            </span>
            {ride.instantBooking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FF] px-2.5 py-0.5 text-xs font-semibold text-[#1E90FF]">
                <Zap className="h-3 w-3" /> Instant Booking
              </span>
            )}
            {ride.liveLocationSharingEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">
                <Radio className="h-3 w-3" /> Live ETA Enabled
              </span>
            )}
          </div>
          <h1 className="mt-3 text-[22px] font-bold text-[#050412]">
            {ride.originName} → {ride.destName}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5E6878]">
            <Clock className="h-4 w-4 text-[#1E90FF]" />
            Departure: {new Date(ride.departureTime).toLocaleString()}
          </p>
          {ride.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ride.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-[#E9EEF5] px-3 py-1 text-xs font-medium text-[#050412]"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-extrabold text-[#050412]">
            {ride.price}{" "}
            <span className="text-sm font-semibold text-[#5E6878]">EGP / seat</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1E90FF]">
            {isFull
              ? `Full • ${ride.standbyCount} on Standby`
              : `${ride.availableSeats} of ${ride.totalSeats} seats available`}
          </p>
        </div>
      </div>

      {/* Map + Driver / Booking */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AlongMap
            center={[ride.originLat, ride.originLng]}
            zoom={9}
            points={[
              {
                id: "origin",
                lat: ride.originLat,
                lng: ride.originLng,
                label: ride.originName,
                kind: "origin",
              },
              {
                id: "dest",
                lat: ride.destLat,
                lng: ride.destLng,
                label: ride.destName,
                kind: "dest",
              },
            ]}
            selectedRoute={{
              id: ride.id,
              originLat: ride.originLat,
              originLng: ride.originLng,
              destLat: ride.destLat,
              destLng: ride.destLng,
            }}
            heightClass="h-80"
          />

          {/* Driver & Vehicle Info */}
          <div className="along-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-[#050412]">
                    {ride.driver.name}
                  </h2>
                  {ride.driver.kycStatus === "VERIFIED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FF] px-2 py-0.5 text-[11px] font-semibold text-[#1E90FF]">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified ID
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5E6878]">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  {ride.driverAverageRating !== null
                    ? `${ride.driverAverageRating} / 5 (${ride.driverReviewCount} reviews)`
                    : "New driver on Along"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenChat}
                className="along-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </button>
            </div>

            {ride.driver.bio && (
              <p className="text-sm text-[#5E6878]">{ride.driver.bio}</p>
            )}

            {ride.vehicle && (
              <div className="rounded-[12px] bg-[#E9EEF5] p-3 text-xs text-[#050412]">
                <p className="font-semibold">
                  {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model} (
                  {ride.vehicle.year}) • {ride.vehicle.plateNumber}
                </p>
                <p className="mt-1 text-[#5E6878]">
                  Trunk: {ride.vehicle.trunkDescription} (Capacity:{" "}
                  {ride.maxLuggageUnits} units, Currently used:{" "}
                  {ride.usedLuggageUnits} units)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Luggage Fit Check + Booking / Standby */}
        <div className="space-y-5">
          {ride.status === "OPEN" && (
            <form onSubmit={handleBook} className="along-card p-5 space-y-4">
              <h2 className="text-[18px] font-bold text-[#050412]">
                {isFull ? "Join Standby Queue" : "Select Seats & Luggage"}
              </h2>

              {bookingErr && (
                <div className="rounded-[12px] bg-[#FEE2E2] p-3 text-sm font-medium text-[#DC2626]">
                  {bookingErr}
                </div>
              )}
              {bookingMsg && (
                <div className="rounded-[12px] bg-[#DCFCE7] p-3 text-sm font-medium text-[#16A34A]">
                  {bookingMsg}
                </div>
              )}

              {/* Seats */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  Seats Needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, ride.availableSeats || 3)}
                  value={seatsRequested}
                  onChange={(e) => setSeatsRequested(Number(e.target.value))}
                  className="mt-1 w-28 rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm font-semibold"
                />
              </div>

              {/* Selectable Luggage Cards */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  <Briefcase className="h-3.5 w-3.5 text-[#1E90FF]" />
                  Luggage Size (Smart Trunk Fit Check)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {LUGGAGE_OPTIONS.map((opt) => {
                    const active = luggageSize === opt.size;
                    return (
                      <button
                        key={opt.size}
                        type="button"
                        onClick={() => setLuggageSize(opt.size)}
                        className={`rounded-[12px] border p-3 text-left transition ${
                          active
                            ? "border-[#1E90FF] bg-[#EBF5FF]"
                            : "border-[#DCE3EE] bg-white hover:bg-[#F7F9FC]"
                        }`}
                      >
                        <p className="text-sm font-bold text-[#050412]">
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[#5E6878]">{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Smart Fit Banner */}
              {luggageFit && (
                <div
                  className={`flex items-start gap-2.5 rounded-[12px] p-3 text-xs font-medium ${
                    luggageFit.status === "FITS_COMFORTABLY"
                      ? "bg-[#DCFCE7] text-[#16A34A]"
                      : luggageFit.status === "TIGHT_FIT"
                      ? "bg-[#FEF3C7] text-[#D97706]"
                      : "bg-[#FEE2E2] text-[#DC2626]"
                  }`}
                >
                  {luggageFit.status === "FITS_COMFORTABLY" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold">
                      {luggageFit.status.replaceAll("_", " ")} (
                      {luggageFit.utilizationPct}%)
                    </p>
                    <p className="mt-0.5">{luggageFit.message}</p>
                  </div>
                </div>
              )}

              {/* Action CTAs */}
              {!isFull ? (
                <div className="space-y-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="along-btn-primary w-full py-3 text-[15px]"
                  >
                    {submitting
                      ? "Processing..."
                      : ride.instantBooking
                      ? `Instant Book • ${ride.price * seatsRequested} EGP`
                      : `Request Seat • ${ride.price * seatsRequested} EGP`}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleJoinStandby}
                    className="along-btn-secondary w-full py-2.5 text-sm"
                  >
                    Or Join Standby Queue (No Charge)
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleJoinStandby}
                  className="along-btn-primary w-full py-3 text-[15px]"
                >
                  {submitting
                    ? "Joining Queue..."
                    : "Join Standby Queue (Free Backup)"}
                </button>
              )}
            </form>
          )}

          {/* Review Form on Completed Rides */}
          {ride.status === "COMPLETED" && (
            <form onSubmit={handleReview} className="along-card p-5 space-y-4">
              <h2 className="text-[18px] font-bold text-[#050412]">
                Rate This Trip
              </h2>
              {reviewErr && (
                <div className="rounded-[12px] bg-[#FEE2E2] p-2.5 text-sm text-[#DC2626]">
                  {reviewErr}
                </div>
              )}
              {reviewMsg && (
                <div className="rounded-[12px] bg-[#DCFCE7] p-2.5 text-sm text-[#16A34A]">
                  {reviewMsg}
                </div>
              )}

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
                      rating >= n
                        ? "border-[#F59E0B] bg-[#FEF3C7] text-[#D97706]"
                        : "border-[#DCE3EE] text-[#5E6878]"
                    }`}
                  >
                    {n}★
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          active ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        active
                          ? "bg-[#1E90FF] text-white"
                          : "bg-[#E9EEF5] text-[#5E6878]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the ride?"
                className="w-full rounded-[12px] border border-[#DCE3EE] p-3 text-sm focus:border-[#1E90FF] focus:outline-none"
              />

              <button
                type="submit"
                className="along-btn-primary w-full py-2.5 text-sm"
              >
                Submit Review
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="along-card p-6">
        <h2 className="text-[18px] font-bold text-[#050412]">
          Driver Reviews ({ride.driver.reviewsReceived.length})
        </h2>
        {ride.driver.reviewsReceived.length === 0 ? (
          <p className="mt-2 text-sm text-[#5E6878]">No reviews yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ride.driver.reviewsReceived.map((rev) => (
              <div
                key={rev.id}
                className="rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] p-4"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#050412]">
                    {rev.reviewer.name}
                  </span>
                  <span className="font-bold text-[#F59E0B]">
                    {rev.rating} / 5 ★
                  </span>
                </div>
                {rev.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rev.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#EBF5FF] px-2 py-0.5 text-[10px] font-semibold text-[#1E90FF]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-sm text-[#5E6878]">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RideDetailsPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-[#5E6878]">
          Loading ride details...
        </p>
      }
    >
      <RideDetailsContent />
    </Suspense>
  );
}
