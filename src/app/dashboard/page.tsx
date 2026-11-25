"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageCircle, Radio, Sparkles } from "lucide-react";

interface BookingItem {
  id: string;
  seatsRequested: number;
  luggageSize: string;
  totalFare: number;
  paymentStatus: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  ride: {
    id: string;
    originName: string;
    destName: string;
    departureTime: string;
    price: number;
    liveLocationSharingEnabled: boolean;
    status: "OPEN" | "COMPLETED" | "CANCELLED";
    driver: { id: string; name: string; phone: string; kycStatus: string };
  };
}

interface StandbyItem {
  id: string;
  seatsRequested: number;
  luggageSize: string;
  status: "WAITING" | "OFFERED" | "PROMOTED" | "CANCELLED" | "EXPIRED";
  offerExpiresAt: string | null;
  ride: {
    id: string;
    originName: string;
    destName: string;
    departureTime: string;
    price: number;
    driver: { id: string; name: string; kycStatus: string };
  };
}

interface PublishedRide {
  id: string;
  originName: string;
  destName: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  bookings: Array<{
    id: string;
    seatsRequested: number;
    luggageSize: string;
    status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
    passenger: { id: string; name: string; phone: string; kycStatus: string };
  }>;
  standbyRequests: Array<{
    id: string;
    seatsRequested: number;
    status: string;
    passenger: { id: string; name: string };
  }>;
}

export default function YourRidesDashboardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"BOOKED" | "PUBLISHED">("BOOKED");
  const [subTab, setSubTab] = useState<"UPCOMING" | "STANDBY" | "PAST" | "CANCELLED">("UPCOMING");

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [standby, setStandby] = useState<StandbyItem[]>([]);
  const [published, setPublished] = useState<PublishedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const [bRes, rRes] = await Promise.all([
        fetch("/api/bookings/my-bookings"),
        fetch("/api/rides/my-rides"),
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        setBookings(bData.bookings ?? []);
        setStandby(bData.standbyRequests ?? []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setPublished(rData.rides ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBookingAction(
    bookingId: string,
    status: "CONFIRMED" | "REJECTED" | "CANCELLED"
  ) {
    setFeedback("");
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      if (status === "CANCELLED" && data.promotedStandby) {
        setFeedback(
          "Booking cancelled & refunded. Next passenger in Standby Queue was automatically offered the seat!"
        );
      } else {
        setFeedback(`Booking marked as ${status}.`);
      }
      loadData();
    }
  }

  async function handleStandbyAction(
    standbyId: string,
    action: "ACCEPT" | "CANCEL"
  ) {
    setFeedback("");
    const res = await fetch(`/api/standby/${standbyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback(
        action === "ACCEPT"
          ? "Standby offer accepted! Your seat is now CONFIRMED."
          : "Standby request cancelled."
      );
      loadData();
    } else {
      setFeedback(data.error || "Action failed");
    }
  }

  async function handleOpenTripChat(rideId: string, passengerId?: string) {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId, passengerId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/chat?roomId=${data.room.id}`);
    }
  }

  async function handleRideStatus(
    rideId: string,
    status: "COMPLETED" | "CANCELLED"
  ) {
    await fetch(`/api/rides/${rideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  const filteredBookings = bookings.filter((b) => {
    if (subTab === "UPCOMING") {
      return (
        b.ride.status === "OPEN" &&
        (b.status === "CONFIRMED" || b.status === "PENDING")
      );
    }
    if (subTab === "PAST") return b.ride.status === "COMPLETED";
    if (subTab === "CANCELLED") {
      return (
        b.status === "CANCELLED" ||
        b.status === "REJECTED" ||
        b.ride.status === "CANCELLED"
      );
    }
    return false;
  });

  const filteredPublished = published.filter((r) => {
    if (subTab === "UPCOMING") return r.status === "OPEN";
    if (subTab === "PAST") return r.status === "COMPLETED";
    if (subTab === "CANCELLED") return r.status === "CANCELLED";
    if (subTab === "STANDBY") return r.standbyRequests.length > 0;
    return true;
  });

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[#5E6878]">
        Loading Your Rides...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#050412]">Your Rides</h1>
          <p className="text-sm text-[#5E6878]">
            Manage booked trips, standby offers, and published rides.
          </p>
        </div>

        {/* Segmented Control: Booked | Published */}
        <div className="inline-flex rounded-full bg-[#E9EEF5] p-1">
          {(["BOOKED", "PUBLISHED"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${
                mode === m
                  ? "bg-white text-[#050412] shadow-xs"
                  : "text-[#5E6878] hover:text-[#050412]"
              }`}
            >
              {m === "BOOKED" ? "Booked" : "Published"}
            </button>
          ))}
        </div>
      </div>

      {/* Underline Sub-Tabs */}
      <div className="flex gap-6 border-b border-[#DCE3EE]">
        {(
          [
            { id: "UPCOMING", label: "Upcoming" },
            { id: "STANDBY", label: `Standby (${standby.filter((s) => s.status === "WAITING" || s.status === "OFFERED").length})` },
            { id: "PAST", label: "Past" },
            { id: "CANCELLED", label: "Cancelled" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`border-b-2 pb-2.5 text-sm font-semibold transition ${
              subTab === tab.id
                ? "border-[#1E90FF] text-[#1E90FF]"
                : "border-transparent text-[#5E6878] hover:text-[#050412]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="rounded-[12px] bg-[#EBF5FF] p-3 text-sm font-medium text-[#1E90FF]">
          {feedback}
        </div>
      )}

      {/* BOOKED -> STANDBY TAB */}
      {mode === "BOOKED" && subTab === "STANDBY" && (
        <div className="space-y-4">
          {standby.length === 0 ? (
            <div className="along-card p-8 text-center text-sm text-[#5E6878]">
              No active standby requests. You can join a Standby Queue on any
              full or alternative ride.
            </div>
          ) : (
            standby.map((s) => (
              <div
                key={s.id}
                className="along-card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      s.status === "OFFERED"
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : "bg-[#EBF5FF] text-[#1E90FF]"
                    }`}
                  >
                    {s.status}
                  </span>
                  <Link
                    href={`/rides/${s.ride.id}`}
                    className="mt-1.5 block text-base font-bold text-[#050412] hover:text-[#1E90FF]"
                  >
                    {s.ride.originName} → {s.ride.destName}
                  </Link>
                  <p className="mt-1 text-xs text-[#5E6878]">
                    {new Date(s.ride.departureTime).toLocaleString()} •{" "}
                    {s.seatsRequested} seat(s) • {s.luggageSize} bag •{" "}
                    {s.ride.price} EGP
                  </p>
                </div>

                <div className="flex gap-2">
                  {s.status === "OFFERED" && (
                    <button
                      type="button"
                      onClick={() => handleStandbyAction(s.id, "ACCEPT")}
                      className="along-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Claim Seat Now
                    </button>
                  )}
                  {(s.status === "WAITING" || s.status === "OFFERED") && (
                    <button
                      type="button"
                      onClick={() => handleStandbyAction(s.id, "CANCEL")}
                      className="rounded-[12px] border border-[#DC2626] px-3.5 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                    >
                      Leave Queue
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* BOOKED -> UPCOMING / PAST / CANCELLED */}
      {mode === "BOOKED" && subTab !== "STANDBY" && (
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="along-card p-8 text-center text-sm text-[#5E6878]">
              No bookings in this category.
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div key={b.id} className="along-card p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-[#DCFCE7] text-[#16A34A]"
                            : b.status === "PENDING"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#FEE2E2] text-[#DC2626]"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="rounded-full bg-[#E9EEF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#5E6878]">
                        Payment: {b.paymentStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <Link
                      href={`/rides/${b.ride.id}`}
                      className="mt-2 block text-base font-bold text-[#050412] hover:text-[#1E90FF]"
                    >
                      {b.ride.originName} → {b.ride.destName}
                    </Link>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#5E6878]">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(b.ride.departureTime).toLocaleString()} •{" "}
                      {b.seatsRequested} seat(s) • {b.luggageSize} bag •{" "}
                      <strong>{b.totalFare} EGP</strong>
                    </p>
                    {b.status === "CONFIRMED" && (
                      <p className="mt-1 text-xs font-semibold text-[#16A34A]">
                        Driver: {b.ride.driver.name} ({b.ride.driver.phone})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenTripChat(b.ride.id)}
                      className="along-btn-secondary inline-flex items-center gap-1 px-3 py-2 text-xs"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat
                    </button>

                    {b.ride.status === "OPEN" &&
                      (b.status === "CONFIRMED" || b.status === "PENDING") && (
                        <button
                          type="button"
                          onClick={() => handleBookingAction(b.id, "CANCELLED")}
                          className="rounded-[12px] border border-[#DC2626] px-3.5 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                        >
                          Cancel Booking
                        </button>
                      )}

                    {b.status === "CONFIRMED" &&
                      b.ride.status === "COMPLETED" && (
                        <Link
                          href={`/rides/${b.ride.id}`}
                          className="along-btn-primary px-4 py-2 text-xs"
                        >
                          Rate Driver
                        </Link>
                      )}
                  </div>
                </div>

                {b.status === "CONFIRMED" &&
                  b.ride.status === "OPEN" &&
                  b.ride.liveLocationSharingEnabled && (
                    <div className="flex items-center gap-2 rounded-[12px] bg-[#DCFCE7] px-3 py-2 text-xs font-semibold text-[#16A34A]">
                      <Radio className="h-3.5 w-3.5" />
                      Driver live ETA sharing is enabled for this trip.
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      )}

      {/* PUBLISHED RIDES */}
      {mode === "PUBLISHED" && (
        <div className="space-y-4">
          {filteredPublished.length === 0 ? (
            <div className="along-card p-8 text-center">
              <p className="text-sm text-[#5E6878]">
                No published rides in this tab.
              </p>
              <Link
                href="/publish"
                className="along-btn-primary mt-4 inline-block px-5 py-2.5 text-sm"
              >
                Publish a Ride
              </Link>
            </div>
          ) : (
            filteredPublished.map((ride) => (
              <div key={ride.id} className="along-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/rides/${ride.id}`}
                      className="text-base font-bold text-[#050412] hover:text-[#1E90FF]"
                    >
                      {ride.originName} → {ride.destName}
                    </Link>
                    <p className="mt-1 text-xs text-[#5E6878]">
                      {new Date(ride.departureTime).toLocaleString()} •{" "}
                      {ride.availableSeats}/{ride.totalSeats} seats left •{" "}
                      {ride.price} EGP • <strong>{ride.status}</strong>
                    </p>
                  </div>

                  {ride.status === "OPEN" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRideStatus(ride.id, "COMPLETED")}
                        className="inline-flex items-center gap-1 rounded-[12px] bg-[#16A34A] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRideStatus(ride.id, "CANCELLED")}
                        className="rounded-[12px] border border-[#DC2626] px-3.5 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Bookings */}
                <div className="space-y-2 border-t border-[#E9EEF5] pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#5E6878]">
                    Bookings ({ride.bookings.length}) • Standby Queue (
                    {ride.standbyRequests.length})
                  </p>
                  {ride.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#F7F9FC] px-3.5 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-semibold text-[#050412]">
                          {b.passenger.name}
                        </span>{" "}
                        <span className="text-xs text-[#5E6878]">
                          • {b.seatsRequested} seat(s) • {b.luggageSize} bag •{" "}
                          <strong>{b.status}</strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenTripChat(ride.id, b.passenger.id)
                          }
                          className="rounded-lg border border-[#DCE3EE] bg-white px-2.5 py-1 text-xs font-semibold text-[#1E90FF] hover:bg-[#EBF5FF]"
                        >
                          Chat
                        </button>
                        {b.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleBookingAction(b.id, "CONFIRMED")
                              }
                              className="rounded-lg bg-[#1E90FF] px-3 py-1 text-xs font-semibold text-white"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleBookingAction(b.id, "REJECTED")
                              }
                              className="rounded-lg bg-[#DC2626] px-3 py-1 text-xs font-semibold text-white"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
