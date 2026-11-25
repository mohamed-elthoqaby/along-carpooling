"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CarFront,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

interface UserFullProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  role: string;
  kycStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  kycIdNumber: string | null;
  kycNote: string | null;
  createdAt: string;
  stats: {
    completedRides: number;
    averageRating: number | null;
    totalReviews: number;
    reliabilityPct: number;
  };
  aiOverview: string;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    maxPassengerSeats: number;
    trunkDescription: string;
    maxLuggageUnits: number;
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    tags: string[];
    comment: string;
    reviewer: { name: string };
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserFullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // KYC Form
  const [kycIdNumber, setKycIdNumber] = useState("");
  const [kycNote, setKycNote] = useState("");
  const [kycMsg, setKycMsg] = useState("");

  // Vehicle Form
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(2023);
  const [color, setColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [maxPassengerSeats, setMaxPassengerSeats] = useState(4);
  const [trunkDescription, setTrunkDescription] = useState(
    "Standard sedan trunk"
  );
  const [maxLuggageUnits, setMaxLuggageUnits] = useState(6);
  const [vehicleMsg, setVehicleMsg] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleKycSubmit(e: FormEvent) {
    e.preventDefault();
    setKycMsg("");
    const res = await fetch("/api/profile/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kycIdNumber, kycNote }),
    });
    if (res.ok) {
      setKycMsg("Verification request submitted! Admin will review shortly.");
      loadProfile();
    }
  }

  async function handleAddVehicle(e: FormEvent) {
    e.preventDefault();
    setVehicleMsg("");
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make,
        model,
        year: Number(year),
        color,
        plateNumber,
        maxPassengerSeats: Number(maxPassengerSeats),
        trunkDescription,
        maxLuggageUnits: Number(maxLuggageUnits),
      }),
    });
    if (res.ok) {
      setVehicleMsg("Vehicle registered! You can now select it when publishing rides.");
      setMake("");
      setModel("");
      setColor("");
      setPlateNumber("");
      loadProfile();
    }
  }

  if (loading || !user) {
    return (
      <p className="py-10 text-center text-sm text-[#5E6878]">
        Loading profile...
      </p>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Identity Header */}
      <div className="along-card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#050412] text-xl font-extrabold text-white">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-[#050412]">
                {user.name}
              </h1>
              {user.kycStatus === "VERIFIED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FF] px-2.5 py-0.5 text-xs font-semibold text-[#1E90FF]">
                  <BadgeCheck className="h-4 w-4" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-[#5E6878]">
              {user.email} • {user.phone}
            </p>
            {user.bio && (
              <p className="mt-1 text-sm text-[#050412]">{user.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Stats Card */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="along-card p-4 text-center">
          <p className="text-2xl font-extrabold text-[#050412]">
            {user.stats.completedRides}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#5E6878]">
            Rides Completed
          </p>
        </div>
        <div className="along-card p-4 text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-[#050412]">
            <Star className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
            {user.stats.averageRating !== null
              ? user.stats.averageRating.toFixed(1)
              : "—"}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#5E6878]">
            Rating ({user.stats.totalReviews})
          </p>
        </div>
        <div className="along-card p-4 text-center">
          <p className="text-2xl font-extrabold text-[#16A34A]">
            {user.stats.reliabilityPct}%
          </p>
          <p className="mt-1 text-xs font-semibold text-[#5E6878]">
            Reliability
          </p>
        </div>
      </div>

      {/* Deterministic AI Overview Card */}
      <div className="rounded-[16px] border border-[#8DCCFF] bg-[#EBF5FF] p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1E90FF]">
          <Sparkles className="h-4 w-4" />
          AI Overview
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#050412]">
          {user.aiOverview}
        </p>
      </div>

      {/* Verification Checklist & KYC */}
      <div id="verification" className="along-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#1E90FF]" />
          <h2 className="text-[18px] font-bold text-[#050412]">
            Verification Checklist
          </h2>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-[12px] bg-[#DCFCE7] px-3.5 py-2.5 text-xs font-semibold text-[#16A34A]">
            <CheckCircle2 className="h-4 w-4" /> Email Confirmed
          </div>
          <div className="flex items-center gap-2 rounded-[12px] bg-[#DCFCE7] px-3.5 py-2.5 text-xs font-semibold text-[#16A34A]">
            <CheckCircle2 className="h-4 w-4" /> Phone Added
          </div>
          <div
            className={`flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-xs font-semibold ${
              user.kycStatus === "VERIFIED"
                ? "bg-[#EBF5FF] text-[#1E90FF]"
                : user.kycStatus === "PENDING"
                ? "bg-[#FEF3C7] text-[#D97706]"
                : "bg-[#E9EEF5] text-[#5E6878]"
            }`}
          >
            <BadgeCheck className="h-4 w-4" /> Government ID: {user.kycStatus}
          </div>
        </div>

        {user.kycStatus !== "VERIFIED" && (
          <form
            onSubmit={handleKycSubmit}
            className="space-y-3 border-t border-[#E9EEF5] pt-4"
          >
            <p className="text-sm font-semibold text-[#050412]">
              Submit Government ID Verification
            </p>
            {kycMsg && (
              <p className="text-xs font-semibold text-[#16A34A]">{kycMsg}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={kycIdNumber}
                onChange={(e) => setKycIdNumber(e.target.value)}
                placeholder="National ID / Driver License Number"
                className="rounded-[12px] border border-[#DCE3EE] px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                value={kycNote}
                onChange={(e) => setKycNote(e.target.value)}
                placeholder="Optional verification note"
                className="rounded-[12px] border border-[#DCE3EE] px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="along-btn-primary px-5 py-2.5 text-xs"
            >
              Submit for Admin Verification
            </button>
          </form>
        )}
      </div>

      {/* Vehicles & Trunk Specs */}
      <div className="along-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CarFront className="h-5 w-5 text-[#1E90FF]" />
          <h2 className="text-[18px] font-bold text-[#050412]">
            My Vehicles & Trunk Specs ({user.vehicles.length})
          </h2>
        </div>

        {user.vehicles.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {user.vehicles.map((v) => (
              <div
                key={v.id}
                className="rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] p-3.5 text-sm"
              >
                <p className="font-bold text-[#050412]">
                  {v.color} {v.make} {v.model} ({v.year})
                </p>
                <p className="text-xs text-[#5E6878]">
                  Plate: {v.plateNumber} • Max {v.maxPassengerSeats} seats
                </p>
                <p className="mt-1 text-xs text-[#1E90FF]">
                  Trunk: {v.trunkDescription} ({v.maxLuggageUnits} units)
                </p>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAddVehicle}
          className="space-y-3 border-t border-[#E9EEF5] pt-4"
        >
          <p className="text-sm font-semibold text-[#050412]">
            Register a Vehicle (to publish rides)
          </p>
          {vehicleMsg && (
            <p className="text-xs font-semibold text-[#16A34A]">{vehicleMsg}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              required
              placeholder="Make (Hyundai)"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Model (Elantra)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              type="text"
              required
              placeholder="Plate Number"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={8}
              required
              placeholder="Max Seats"
              value={maxPassengerSeats}
              onChange={(e) => setMaxPassengerSeats(Number(e.target.value))}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Trunk Description"
              value={trunkDescription}
              onChange={(e) => setTrunkDescription(e.target.value)}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={20}
              required
              placeholder="Max Luggage Units"
              value={maxLuggageUnits}
              onChange={(e) => setMaxLuggageUnits(Number(e.target.value))}
              className="rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="along-btn-primary px-5 py-2.5 text-xs"
          >
            Add Vehicle
          </button>
        </form>
      </div>

      {/* Reviews */}
      <div className="along-card p-6">
        <h2 className="text-[18px] font-bold text-[#050412]">
          Community Reviews ({user.reviewsReceived.length})
        </h2>
        {user.reviewsReceived.length === 0 ? (
          <p className="mt-2 text-sm text-[#5E6878]">No reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {user.reviewsReceived.map((r) => (
              <div
                key={r.id}
                className="rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] p-3.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#050412]">
                    {r.reviewer.name}
                  </span>
                  <span className="font-bold text-[#F59E0B]">
                    {r.rating} / 5 ★
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#5E6878]">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
