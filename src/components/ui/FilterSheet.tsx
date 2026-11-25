"use client";

import { SlidersHorizontal, X } from "lucide-react";

export const ALL_AMENITIES = [
  "AC",
  "Max 2 in back",
  "Pets allowed",
  "Instant booking",
  "Smoking allowed",
] as const;

export interface FilterState {
  minHour: number;
  maxHour: number;
  amenities: string[];
  verifiedOnly: boolean;
  sort: "earliest" | "lowest_price" | "highest_rating";
  includeFull: boolean;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onApply: () => void;
}

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onApply,
}: FilterSheetProps) {
  if (!open) return null;

  function toggleAmenity(amenity: string) {
    const exists = filters.amenities.includes(amenity);
    onChange({
      ...filters,
      amenities: exists
        ? filters.amenities.filter((a) => a !== amenity)
        : [...filters.amenities, amenity],
    });
  }

  function resetAll() {
    onChange({
      minHour: 0,
      maxHour: 23,
      amenities: [],
      verifiedOnly: false,
      sort: "earliest",
      includeFull: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(5,4,18,0.45)] sm:items-center">
      <div className="w-full max-w-lg rounded-t-[24px] bg-white p-5 shadow-[0_-8px_32px_rgba(5,4,18,0.14)] sm:rounded-[24px]">
        {/* Drag Handle */}
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#DCE3EE] sm:hidden" />

        <div className="flex items-center justify-between border-b border-[#DCE3EE] pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#1E90FF]" />
            <h2 className="text-[18px] font-bold text-[#050412]">Filters</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-semibold text-[#1E90FF] hover:underline"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="rounded-full p-1 text-[#5E6878] hover:bg-[#E9EEF5]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto py-4">
          {/* Departure Time Window */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#050412]">
                Departure Time Window
              </label>
              <span className="text-xs font-semibold text-[#1E90FF]">
                {String(filters.minHour).padStart(2, "0")}:00 –{" "}
                {String(filters.maxHour).padStart(2, "0")}:59
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  From Hour
                </span>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={filters.minHour}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChange({
                      ...filters,
                      minHour: Math.min(val, filters.maxHour),
                    });
                  }}
                  className="mt-1 w-full accent-[#1E90FF]"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6878]">
                  To Hour
                </span>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={filters.maxHour}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onChange({
                      ...filters,
                      maxHour: Math.max(val, filters.minHour),
                    });
                  }}
                  className="mt-1 w-full accent-[#1E90FF]"
                />
              </div>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <p className="text-sm font-semibold text-[#050412]">Sort by</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { id: "earliest", label: "Earliest" },
                  { id: "lowest_price", label: "Lowest Price" },
                  { id: "highest_rating", label: "Top Rated" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...filters, sort: opt.id })}
                  className={`rounded-[12px] border px-3 py-2 text-xs font-semibold transition ${
                    filters.sort === opt.id
                      ? "border-[#1E90FF] bg-[#EBF5FF] text-[#1E90FF]"
                      : "border-[#DCE3EE] bg-white text-[#5E6878]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trust & Standby Toggles */}
          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#DCE3EE] p-3">
              <span className="text-sm font-medium text-[#050412]">
                Verified Government ID drivers only
              </span>
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) =>
                  onChange({ ...filters, verifiedOnly: e.target.checked })
                }
                className="h-4 w-4 accent-[#1E90FF]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-[#DCE3EE] p-3">
              <span className="text-sm font-medium text-[#050412]">
                Include full rides (for Standby Queue)
              </span>
              <input
                type="checkbox"
                checked={filters.includeFull}
                onChange={(e) =>
                  onChange({ ...filters, includeFull: e.target.checked })
                }
                className="h-4 w-4 accent-[#1E90FF]"
              />
            </label>
          </div>

          {/* Amenities */}
          <div>
            <p className="text-sm font-semibold text-[#050412]">Ride Amenities</p>
            <div className="mt-2 space-y-2">
              {ALL_AMENITIES.map((amenity) => {
                const active = filters.amenities.includes(amenity);
                return (
                  <label
                    key={amenity}
                    className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? "border-[#1E90FF] bg-[#EBF5FF] text-[#050412]"
                        : "border-[#DCE3EE] bg-white text-[#5E6878]"
                    }`}
                  >
                    <span>{amenity}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleAmenity(amenity)}
                      className="h-4 w-4 accent-[#1E90FF]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onApply();
            onClose();
          }}
          className="along-btn-primary mt-2 w-full py-3 text-[15px]"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
