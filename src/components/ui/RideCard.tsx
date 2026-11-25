"use client";

import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Star, Users, Zap } from "lucide-react";

export interface RideCardData {
  id: string;
  originName: string;
  destName: string;
  departureTime: string;
  estimatedArrivalTime?: string | null;
  availableSeats: number;
  totalSeats: number;
  price: number;
  instantBooking?: boolean;
  amenities?: string[];
  status?: string;
  driverAverageRating?: number | null;
  driverReviewCount?: number;
  driver: {
    id: string;
    name: string;
    kycStatus?: string;
  };
}

interface RideCardProps {
  ride: RideCardData;
  selected?: boolean;
  onSelect?: () => void;
  statusBadge?: { label: string; tone: "confirmed" | "standby" | "pending" | "cancelled" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function RideCard({ ride, selected, onSelect, statusBadge }: RideCardProps) {
  const isFull = ride.availableSeats <= 0;
  const initials = ride.driver.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={`along-card min-w-0 p-4 transition ${
        onSelect ? "cursor-pointer hover:border-[#1E90FF]" : ""
      } ${selected ? "border-[#1E90FF] ring-2 ring-[#1E90FF]/20" : ""}`}
    >
      {/* Top: Vertical Route Timeline + Price Callout */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-2.5">
          {/* Timeline column */}
          <div className="flex flex-col items-center pt-1">
            <span className="h-3 w-3 rounded-full border-2 border-[#1E90FF] bg-white" />
            <span className="my-1 h-8 w-0.5 bg-[#DCE3EE]" />
            <MapPin className="h-4 w-4 text-[#1E90FF]" />
          </div>

          {/* Locations & times */}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#1E90FF]">
                  {formatTime(ride.departureTime)}
                </span>
                <span className="text-[11px] font-medium text-[#5E6878]">
                  {formatDate(ride.departureTime)}
                </span>
              </div>
              <p className="truncate text-[15px] font-semibold text-[#050412]">
                {ride.originName}
              </p>
            </div>

            <div>
              {ride.estimatedArrivalTime && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-[#5E6878]">
                  <Clock className="h-3 w-3" />
                  Est. {formatTime(ride.estimatedArrivalTime)}
                </span>
              )}
              <p className="truncate text-[15px] font-semibold text-[#050412]">
                {ride.destName}
              </p>
            </div>
          </div>
        </div>

        {/* Price & Seats */}
        <div className="shrink-0 text-right">
          <p className="text-[18px] font-extrabold text-[#050412]">
            {ride.price} <span className="text-xs font-semibold text-[#5E6878]">EGP</span>
          </p>
          <p
            className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
              isFull ? "text-[#D97706]" : "text-[#5E6878]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {isFull ? "Full (Standby)" : `${ride.availableSeats} seat${ride.availableSeats > 1 ? "s" : ""} left`}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[#E9EEF5]" />

      {/* Footer: Driver avatar + Verified badge + Rating + Amenity/Status pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E9EEF5] text-xs font-bold text-[#050412]">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-[#050412]">
                {ride.driver.name}
              </span>
              {ride.driver.kycStatus === "VERIFIED" && (
                <BadgeCheck
                  className="h-4 w-4 text-[#1E90FF]"
                  aria-label="Verified ID"
                />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5E6878]">
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="font-semibold text-[#050412]">
                {ride.driverAverageRating !== null &&
                ride.driverAverageRating !== undefined
                  ? ride.driverAverageRating.toFixed(1)
                  : "New"}
              </span>
              {ride.driverReviewCount ? (
                <span>({ride.driverReviewCount})</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ride.instantBooking && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1E90FF]">
              <Zap className="h-3 w-3" />
              Instant
            </span>
          )}

          {statusBadge && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                statusBadge.tone === "confirmed"
                  ? "bg-[#DCFCE7] text-[#16A34A]"
                  : statusBadge.tone === "standby"
                  ? "bg-[#EBF5FF] text-[#1E90FF]"
                  : statusBadge.tone === "cancelled"
                  ? "bg-[#FEE2E2] text-[#DC2626]"
                  : "bg-[#FEF3C7] text-[#D97706]"
              }`}
            >
              {statusBadge.label}
            </span>
          )}

          {ride.amenities?.slice(0, 2).map((a) => (
            <span
              key={a}
              className="rounded-full bg-[#E9EEF5] px-2.5 py-0.5 text-[11px] font-medium text-[#5E6878]"
            >
              {a}
            </span>
          ))}

          <Link
            href={`/rides/${ride.id}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 rounded-lg bg-[#050412] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            {isFull ? "Standby" : "Details"}
          </Link>
        </div>
      </div>
    </div>
  );
}
