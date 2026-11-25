"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { AlongMap } from "@/components/map/AlongMap";
import { ALL_AMENITIES } from "@/components/ui/FilterSheet";

interface VehicleItem {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  maxPassengerSeats: number;
  trunkDescription: string;
  maxLuggageUnits: number;
}

const STEPS = [
  "Route",
  "Schedule",
  "Seats & Price",
  "Vehicle & Trunk",
  "Live Privacy",
  "Amenities",
  "Review",
];

export default function PublishRideWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pickMode, setPickMode] = useState<"origin" | "dest">("origin");

  // Step 1: Route
  const [originName, setOriginName] = useState("Zagazig University Gate");
  const [originLat, setOriginLat] = useState(30.5877);
  const [originLng, setOriginLng] = useState(31.502);
  const [destName, setDestName] = useState("Cairo - Ramses Square");
  const [destLat, setDestLat] = useState(30.0626);
  const [destLng, setDestLng] = useState(31.2469);

  // Step 2: Schedule
  const [departureTime, setDepartureTime] = useState("");

  useEffect(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(0, 0, 0);
    setDepartureTime(tomorrow.toISOString().slice(0, 16));
  }, []);

  // Step 3: Seats & Pricing
  const [totalSeats, setTotalSeats] = useState(3);
  const [price, setPrice] = useState(95);
  const [instantBooking, setInstantBooking] = useState(true);

  // Step 4: Vehicle & Trunk
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [maxLuggageUnits, setMaxLuggageUnits] = useState(6);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);

  // Step 5: Live Tracking Privacy
  const [liveLocationSharingEnabled, setLiveLocationSharingEnabled] =
    useState(true);

  // Step 6: Amenities
  const [amenities, setAmenities] = useState<string[]>(["AC", "Instant booking"]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return { vehicles: [] };
        }
        return res.json();
      })
      .then((data) => {
        const list: VehicleItem[] = data.vehicles ?? [];
        setVehicles(list);
        if (list[0]) {
          setVehicleId(list[0].id);
          setMaxLuggageUnits(list[0].maxLuggageUnits);
        }
      })
      .catch(() => {});
  }, [router]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  function toggleAmenity(item: string) {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }

  function handleNext() {
    setError("");
    if (step === 1 && (!originName.trim() || !destName.trim())) {
      setError("Please enter both origin and destination names.");
      return;
    }
    if (step === 2) {
      const dt = new Date(departureTime);
      if (Number.isNaN(dt.getTime()) || dt.getTime() < Date.now()) {
        setError("Departure time must be in the future.");
        return;
      }
    }
    if (step === 3) {
      const maxAllowed = selectedVehicle?.maxPassengerSeats ?? 6;
      if (totalSeats <= 0 || totalSeats > maxAllowed) {
        setError(`Seats must be between 1 and ${maxAllowed}.`);
        return;
      }
      if (price < 0) {
        setError("Price must be 0 or greater.");
        return;
      }
    }
    setStep((s) => Math.min(7, s + 1));
  }

  async function handleQuickAddVehicle() {
    if (!newMake.trim() || !newModel.trim() || !newColor.trim() || !newPlate.trim()) {
      setError("Please fill make, model, color, and plate number.");
      return;
    }
    setError("");
    setAddingVehicle(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: newMake.trim(),
          model: newModel.trim(),
          year: 2023,
          color: newColor.trim(),
          plateNumber: newPlate.trim(),
          maxPassengerSeats: Math.max(4, totalSeats),
          trunkDescription: "Standard trunk",
          maxLuggageUnits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register vehicle");
        return;
      }
      setVehicles((prev) => [data.vehicle, ...prev]);
      setVehicleId(data.vehicle.id);
      setNewMake("");
      setNewModel("");
      setNewColor("");
      setNewPlate("");
    } finally {
      setAddingVehicle(false);
    }
  }

  async function handlePublish() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleId || undefined,
          originName,
          originLat,
          originLng,
          destName,
          destLat,
          destLng,
          departureTime: new Date(departureTime).toISOString(),
          totalSeats: Number(totalSeats),
          price: Number(price),
          instantBooking,
          liveLocationSharingEnabled,
          maxLuggageUnits: Number(maxLuggageUnits),
          amenities,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish ride");
        return;
      }
      router.push("/rides");
      router.refresh();
    } catch {
      setError("Network error while publishing ride");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[#050412]">
          Publish a Ride
        </h1>
        <p className="text-sm text-[#5E6878]">
          Step {step} of 7 — {STEPS[step - 1]}
        </p>
      </div>

      {/* 7-Step Horizontal Progress Stepper */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          const completed = num < step;
          const active = num === step;
          return (
            <div key={label} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => num <= step && setStep(num)}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                    completed
                      ? "bg-[#1E90FF] text-white"
                      : active
                      ? "border-2 border-[#1E90FF] bg-[#EBF5FF] text-[#1E90FF]"
                      : "bg-[#E9EEF5] text-[#5E6878]"
                  }`}
                >
                  {completed ? <Check className="h-4 w-4" /> : num}
                </span>
                <span className="hidden text-[10px] font-semibold text-[#5E6878] sm:inline">
                  {label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${
                    completed ? "bg-[#1E90FF]" : "bg-[#DCE3EE]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-[12px] bg-[#FEE2E2] p-3 text-sm font-medium text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="along-card p-6">
        {/* Step 1: Route */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickMode("origin")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  pickMode === "origin"
                    ? "bg-[#16A34A] text-white"
                    : "bg-[#E9EEF5] text-[#5E6878]"
                }`}
              >
                Pick Origin on Map
              </button>
              <button
                type="button"
                onClick={() => setPickMode("dest")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  pickMode === "dest"
                    ? "bg-[#DC2626] text-white"
                    : "bg-[#E9EEF5] text-[#5E6878]"
                }`}
              >
                Pick Destination on Map
              </button>
            </div>

            <AlongMap
              center={[originLat, originLng]}
              zoom={9}
              points={[
                {
                  id: "origin",
                  lat: originLat,
                  lng: originLng,
                  label: originName,
                  kind: "origin",
                },
                {
                  id: "dest",
                  lat: destLat,
                  lng: destLng,
                  label: destName,
                  kind: "dest",
                },
              ]}
              selectedRoute={{
                id: "draft",
                originLat,
                originLng,
                destLat,
                destLng,
              }}
              onMapClick={(lat, lng) => {
                if (pickMode === "origin") {
                  setOriginLat(lat);
                  setOriginLng(lng);
                  setPickMode("dest");
                } else {
                  setDestLat(lat);
                  setDestLng(lng);
                }
              }}
              heightClass="h-72"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  Origin Name
                </label>
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-[#DCE3EE] px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  Destination Name
                </label>
                <input
                  type="text"
                  value={destName}
                  onChange={(e) => setDestName(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-[#DCE3EE] px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">
              When are you departing?
            </h2>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                Departure Date & Time
              </label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-[#DCE3EE] px-3.5 py-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 3: Seats & Pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">
              Seats & Per-Seat Price
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  Available Seats
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedVehicle?.maxPassengerSeats ?? 6}
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(Number(e.target.value))}
                  className="mt-1 w-full rounded-[12px] border border-[#DCE3EE] px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  Price per Seat (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  step="5"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="mt-1 w-full rounded-[12px] border border-[#DCE3EE] px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#DCE3EE] p-3.5">
              <div>
                <p className="text-sm font-semibold text-[#050412]">
                  Enable Instant Booking
                </p>
                <p className="text-xs text-[#5E6878]">
                  Passengers are confirmed automatically without manual approval.
                </p>
              </div>
              <input
                type="checkbox"
                checked={instantBooking}
                onChange={(e) => setInstantBooking(e.target.checked)}
                className="h-5 w-5 accent-[#1E90FF]"
              />
            </label>
          </div>
        )}

        {/* Step 4: Vehicle & Trunk Capacity */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">
              Vehicle & Trunk Capacity
            </h2>
            {vehicles.length === 0 ? (
              <div className="space-y-3 rounded-[14px] border border-[#DCE3EE] bg-[#F7F9FC] p-4">
                <p className="text-sm font-bold text-[#050412]">
                  Quick-Register Your Vehicle
                </p>
                <p className="text-xs text-[#5E6878]">
                  Add your car right here so passengers know what to look for.
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Make (e.g. Hyundai)"
                    value={newMake}
                    onChange={(e) => setNewMake(e.target.value)}
                    className="rounded-[10px] border border-[#DCE3EE] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. Elantra)"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="rounded-[10px] border border-[#DCE3EE] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Color (e.g. Silver)"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="rounded-[10px] border border-[#DCE3EE] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Plate Number"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="rounded-[10px] border border-[#DCE3EE] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={addingVehicle}
                  onClick={handleQuickAddVehicle}
                  className="along-btn-primary px-4 py-2 text-xs"
                >
                  {addingVehicle ? "Saving Vehicle..." : "Save & Select Vehicle"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVehicleId(v.id);
                      setMaxLuggageUnits(v.maxLuggageUnits);
                    }}
                    className={`w-full rounded-[12px] border p-3.5 text-left ${
                      vehicleId === v.id
                        ? "border-[#1E90FF] bg-[#EBF5FF]"
                        : "border-[#DCE3EE] bg-white"
                    }`}
                  >
                    <p className="text-sm font-bold text-[#050412]">
                      {v.color} {v.make} {v.model} ({v.year}) • {v.plateNumber}
                    </p>
                    <p className="text-xs text-[#5E6878]">
                      Max {v.maxPassengerSeats} seats • Trunk: {v.trunkDescription}{" "}
                      ({v.maxLuggageUnits} units)
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                Max Luggage Units (Small=1, Medium=2, Large=3)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={maxLuggageUnits}
                onChange={(e) => setMaxLuggageUnits(Number(e.target.value))}
                className="mt-1 w-32 rounded-[12px] border border-[#DCE3EE] px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {/* Step 5: Live Tracking Privacy Toggle */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">
              Live Tracking & ETA Privacy
            </h2>
            <label className="flex cursor-pointer items-center justify-between rounded-[16px] border border-[#DCE3EE] bg-[#F7F9FC] p-4">
              <div className="flex items-start gap-3">
                <Radio className="mt-0.5 h-5 w-5 text-[#16A34A]" />
                <div>
                  <p className="text-sm font-bold text-[#050412]">
                    Share Live Location & ETA with confirmed passengers
                  </p>
                  <p className="mt-1 text-xs text-[#5E6878]">
                    Strictly opt-in. When disabled, passengers only see scheduled
                    pickup time and trip status.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={liveLocationSharingEnabled}
                onChange={(e) => setLiveLocationSharingEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#1E90FF]"
              />
            </label>
          </div>
        )}

        {/* Step 6: Ride Amenities */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">Ride Amenities</h2>
            <div className="space-y-2.5">
              {ALL_AMENITIES.map((a) => {
                const checked = amenities.includes(a);
                return (
                  <label
                    key={a}
                    className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-4 py-3 text-sm font-semibold ${
                      checked
                        ? "border-[#1E90FF] bg-[#EBF5FF] text-[#050412]"
                        : "border-[#DCE3EE] bg-white text-[#5E6878]"
                    }`}
                  >
                    <span>{a}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAmenity(a)}
                      className="h-4 w-4 accent-[#1E90FF]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 7: Review & Publish */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#050412]">
              Review & Publish
            </h2>
            <div className="rounded-[16px] border border-[#DCE3EE] bg-[#F7F9FC] p-4 space-y-2 text-sm">
              <p className="text-base font-bold text-[#050412]">
                {originName} → {destName}
              </p>
              <p className="text-[#5E6878]">
                Departure: {new Date(departureTime).toLocaleString()}
              </p>
              <p className="text-[#5E6878]">
                Seats: <strong>{totalSeats}</strong> • Price:{" "}
                <strong>{price} EGP</strong> • Trunk:{" "}
                <strong>{maxLuggageUnits} units</strong>
              </p>
              <p className="text-[#5E6878]">
                Instant Booking: <strong>{instantBooking ? "Yes" : "No"}</strong>{" "}
                • Live ETA Sharing:{" "}
                <strong>{liveLocationSharingEnabled ? "On" : "Off"}</strong>
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-[#EBF5FF] px-2.5 py-0.5 text-xs font-semibold text-[#1E90FF]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-6 flex items-center justify-between border-t border-[#E9EEF5] pt-4">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-1 rounded-[12px] border border-[#DCE3EE] px-4 py-2.5 text-sm font-semibold text-[#5E6878] hover:bg-[#E9EEF5] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="along-btn-primary inline-flex items-center gap-1 px-6 py-2.5 text-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handlePublish}
              className="along-btn-primary px-6 py-2.5 text-sm"
            >
              {submitting ? "Publishing..." : "Publish Ride"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
