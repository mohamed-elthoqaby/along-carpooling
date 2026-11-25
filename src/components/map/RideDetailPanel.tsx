"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Radio,
  Star,
  X,
  Zap,
} from "lucide-react";
import type { LuggageFitResult, LuggageSizeType } from "@/lib/luggage";

interface RideDetailData {
  id: string;
  originName: string;
  destName: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  instantBooking: boolean;
  liveLocationSharingEnabled: boolean;
  maxLuggageUnits: number;
  usedLuggageUnits: number;
  standbyCount: number;
  amenities: string[];
  status: string;
  driverAverageRating: number | null;
  driverReviewCount: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    trunkDescription: string;
  } | null;
  driver: {
    id: string;
    name: string;
    kycStatus: string;
    bio: string;
  };
}

const LUGGAGE_TIERS: Array<{
  size: LuggageSizeType;
  label: string;
  units: string;
}> = [
  { size: "NONE", label: "None", units: "0u" },
  { size: "SMALL", label: "Small", units: "1u" },
  { size: "MEDIUM", label: "Medium", units: "2u" },
  { size: "LARGE", label: "Large", units: "3u" },
];

interface RideDetailPanelProps {
  rideId: string;
  onClose: () => void;
  onBooked?: () => void;
}

export function RideDetailPanel({
  rideId,
  onClose,
  onBooked,
}: RideDetailPanelProps) {
  const router = useRouter();
  const [ride, setRide] = useState<RideDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [luggageSize, setLuggageSize] = useState<LuggageSizeType>("SMALL");
  const [fit, setFit] = useState<LuggageFitResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadRide = useCallback(async () => {
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/rides/${rideId}`);
      if (res.ok) {
        const data = await res.json();
        setRide(data.ride);
      }
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    loadRide();
  }, [loadRide]);

  useEffect(() => {
    if (!ride) return;
    fetch(`/api/rides/${rideId}/luggage-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ luggageSize, seatsRequested }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.fit) setFit(d.fit);
      })
      .catch(() => {});
  }, [rideId, ride, luggageSize, seatsRequested]);

  async function handleBook() {
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, seatsRequested, luggageSize }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setErr(data.error || "Booking failed");
        return;
      }
      setMsg(
        data.booking.status === "CONFIRMED"
          ? "Confirmed! Seat locked & trip chat opened."
          : "Request sent! Awaiting driver approval."
      );
      loadRide();
      onBooked?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStandby() {
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/standby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, seatsRequested, luggageSize }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setErr(data.error || "Could not join standby");
        return;
      }
      setMsg("Joined Standby Queue! We'll offer you the seat if one opens.");
      loadRide();
      onBooked?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenChat() {
    setErr("");
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId }),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Could not open chat");
      return;
    }
    router.push(`/chat?roomId=${data.room.id}`);
  }

  if (loading || !ride) {
    return (
      <div className="flex h-full flex-col justify-between p-4">
        <div className="space-y-3">
          <div className="h-6 w-2/3 animate-pulse rounded bg-[#E9EEF5]" />
          <div className="h-24 animate-pulse rounded-[12px] bg-[#E9EEF5]" />
          <div className="h-24 animate-pulse rounded-[12px] bg-[#E9EEF5]" />
        </div>
      </div>
    );
  }

  const isFull = ride.availableSeats <= 0;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE3EE] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E90FF]">
            Ride Details
          </p>
          <p className="truncate text-sm font-bold text-[#050412]">
            {ride.originName} → {ride.destName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/rides/${ride.id}`}
            title="Full ride page"
            className="rounded-full p-1.5 text-[#5E6878] hover:bg-[#E9EEF5]"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-full p-1.5 text-[#5E6878] hover:bg-[#E9EEF5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Status & Schedule */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {ride.instantBooking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1E90FF]">
                <Zap className="h-3 w-3" /> Instant
              </span>
            )}
            {ride.liveLocationSharingEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#16A34A]">
                <Radio className="h-3 w-3" /> Live ETA
              </span>
            )}
            <span className="rounded-full bg-[#E9EEF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#050412]">
              {isFull
                ? `Full (${ride.standbyCount} standby)`
                : `${ride.availableSeats}/${ride.totalSeats} seats left`}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs font-medium text-[#5E6878]">
            <Clock className="h-3.5 w-3.5 text-[#1E90FF]" />
            {new Date(ride.departureTime).toLocaleString()}
          </p>
        </div>

        {/* Driver Card */}
        <div className="rounded-[14px] border border-[#DCE3EE] bg-[#F7F9FC] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#050412]">
                  {ride.driver.name}
                </span>
                {ride.driver.kycStatus === "VERIFIED" && (
                  <BadgeCheck className="h-4 w-4 text-[#1E90FF]" />
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5E6878]">
                <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                <span className="font-semibold text-[#050412]">
                  {ride.driverAverageRating !== null
                    ? ride.driverAverageRating.toFixed(1)
                    : "New"}
                </span>
                <span>({ride.driverReviewCount} reviews)</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenChat}
              className="along-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </button>
          </div>

          {ride.vehicle && (
            <p className="mt-2.5 border-t border-[#DCE3EE] pt-2 text-xs text-[#5E6878]">
              <strong className="text-[#050412]">
                {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
              </strong>{" "}
              • {ride.vehicle.plateNumber}
              <br />
              Trunk: {ride.vehicle.trunkDescription}
            </p>
          )}
        </div>

        {/* Amenities */}
        {ride.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ride.amenities.map((a) => (
              <span
                key={a}
                className="rounded-full bg-[#E9EEF5] px-2.5 py-1 text-[11px] font-semibold text-[#5E6878]"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Seats & Smart Luggage Fit Check */}
        <div className="space-y-3 rounded-[14px] border border-[#DCE3EE] p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#050412]">Seats</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, ride.availableSeats || 3)}
              value={seatsRequested}
              onChange={(e) => setSeatsRequested(Number(e.target.value))}
              className="w-20 rounded-[10px] border border-[#DCE3EE] px-2.5 py-1 text-center text-sm font-bold"
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-[#050412]">
              <Briefcase className="h-3.5 w-3.5 text-[#1E90FF]" />
              Smart Luggage Fit Check
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {LUGGAGE_TIERS.map((tier) => {
                const active = luggageSize === tier.size;
                return (
                  <button
                    key={tier.size}
                    type="button"
                    onClick={() => setLuggageSize(tier.size)}
                    className={`rounded-[10px] border px-2 py-2 text-center text-xs font-semibold transition ${
                      active
                        ? "border-[#1E90FF] bg-[#EBF5FF] text-[#1E90FF]"
                        : "border-[#DCE3EE] bg-white text-[#5E6878]"
                    }`}
                  >
                    <div>{tier.label}</div>
                    <div className="text-[10px] opacity-80">{tier.units}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {fit && (
            <div
              className={`flex items-start gap-2 rounded-[10px] p-2.5 text-xs font-medium ${
                fit.status === "FITS_COMFORTABLY"
                  ? "bg-[#DCFCE7] text-[#16A34A]"
                  : fit.status === "TIGHT_FIT"
                  ? "bg-[#FEF3C7] text-[#D97706]"
                  : "bg-[#FEE2E2] text-[#DC2626]"
              }`}
            >
              {fit.status === "FITS_COMFORTABLY" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {fit.status.replaceAll("_", " ")} ({fit.utilizationPct}%)
                </p>
                <p>{fit.message}</p>
              </div>
            </div>
          )}
        </div>

        {err && (
          <div className="rounded-[12px] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#DC2626]">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-[12px] bg-[#DCFCE7] p-3 text-xs font-semibold text-[#16A34A]">
            {msg}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="border-t border-[#DCE3EE] bg-white p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#5E6878]">
              Total Fare
            </p>
            <p className="text-lg font-extrabold text-[#050412]">
              {ride.price * seatsRequested}{" "}
              <span className="text-xs font-semibold text-[#5E6878]">EGP</span>
            </p>
          </div>

          {!isFull ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleBook}
              className="along-btn-primary flex-1 py-3 text-sm"
            >
              {submitting
                ? "Processing..."
                : ride.instantBooking
                ? "Confirm Instant Seat"
                : "Request Seat"}
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleStandby}
              className="along-btn-primary flex-1 py-3 text-sm"
            >
              {submitting ? "Joining..." : "Join Standby Queue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
