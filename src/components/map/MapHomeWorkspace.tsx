"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUpDown,
  Clock,
  LocateFixed,
  MapPin,
  Menu,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  AlongMap,
  MapPointItem,
  RouteArcItem,
} from "@/components/map/AlongMap";
import { RideCard, RideCardData } from "@/components/ui/RideCard";
import { FilterSheet, FilterState } from "@/components/ui/FilterSheet";
import { RideDetailPanel } from "@/components/map/RideDetailPanel";
import { useAppShell } from "@/components/shell/AppShell";

interface NearbyRide extends RideCardData {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

interface SavedRoute {
  id: string;
  originName: string;
  destName: string;
}

const CITY_PRESETS = [
  { name: "Zagazig", lat: 30.5877, lng: 31.502 },
  { name: "New Cairo", lat: 30.0074, lng: 31.4913 },
  { name: "Cairo", lat: 30.0444, lng: 31.2357 },
  { name: "Alexandria", lat: 31.2194, lng: 29.9416 },
];

const DEFAULT_QUICK_ROUTES: SavedRoute[] = [
  { id: "qr-1", originName: "Zagazig", destName: "Cairo" },
  { id: "qr-2", originName: "New Cairo", destName: "Smart Village" },
  { id: "qr-3", originName: "Alexandria", destName: "Cairo" },
];

type SheetSnap = "collapsed" | "half" | "expanded";

function getSnapOffsetPx(snap: SheetSnap, viewportH: number): number {
  if (snap === "expanded") return 0;
  if (snap === "half") return Math.round(viewportH * 0.34);
  return Math.round(viewportH * 0.56);
}

export function MapHomeWorkspace() {
  const { user, openDrawer } = useAppShell();

  // Map & H3 Search State
  const [lat, setLat] = useState(30.5877);
  const [lng, setLng] = useState(31.502);
  const [pickupLabel, setPickupLabel] = useState("Zagazig");
  const [isUserGps, setIsUserGps] = useState(false);
  const [gpsToast, setGpsToast] = useState("");
  const [locatingGps, setLocatingGps] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [ringSize, setRingSize] = useState(3);
  const [useSpatialFilter, setUseSpatialFilter] = useState(false);

  // Search Form State
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [date, setDate] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    minHour: 0,
    maxHour: 23,
    amenities: [],
    verifiedOnly: false,
    sort: "earliest",
    includeFull: true,
  });

  const [rides, setRides] = useState<NearbyRide[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedRoute[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mobile Draggable Bottom Sheet State (60fps GPU translate3d via direct DOM ref)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("collapsed");
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const currentOffsetRef = useRef(0);

  const applySheetTransform = useCallback(
    (snap: SheetSnap, animate = true) => {
      const el = sheetRef.current;
      if (!el) return;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const offset = getSnapOffsetPx(snap, vh);
      currentOffsetRef.current = offset;
      el.style.transition = animate
        ? "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)"
        : "none";
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    },
    []
  );

  useEffect(() => {
    applySheetTransform(sheetSnap, true);
  }, [sheetSnap, applySheetTransform]);

  useEffect(() => {
    const onResize = () => applySheetTransform(sheetSnap, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sheetSnap, applySheetTransform]);

  const fetchRides = useCallback(
    async (opts?: {
      overrideOrigin?: string;
      overrideDest?: string;
      spatial?: boolean;
      customLat?: number;
      customLng?: number;
      customRing?: number;
    }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const o =
          opts?.overrideOrigin !== undefined ? opts.overrideOrigin : originQuery;
        const d =
          opts?.overrideDest !== undefined ? opts.overrideDest : destQuery;
        const spatial =
          opts?.spatial !== undefined ? opts.spatial : useSpatialFilter;

        if (spatial) {
          params.set("lat", String(opts?.customLat ?? lat));
          params.set("lng", String(opts?.customLng ?? lng));
          params.set("k", String(opts?.customRing ?? ringSize));
        }
        if (o.trim()) params.set("origin", o.trim());
        if (d.trim()) params.set("dest", d.trim());
        if (date) params.set("date", date);
        params.set("minHour", String(filters.minHour));
        params.set("maxHour", String(filters.maxHour));
        if (filters.amenities.length > 0) {
          params.set("amenities", filters.amenities.join(","));
        }
        if (filters.verifiedOnly) params.set("verifiedOnly", "true");
        if (filters.includeFull) params.set("includeFull", "true");
        params.set("sort", filters.sort);

        const res = await fetch(`/api/rides/nearby?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRides(data.rides ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [originQuery, destQuery, useSpatialFilter, lat, lng, ringSize, date, filters]
  );

  useEffect(() => {
    fetchRides({ spatial: false });
    fetch("/api/saved-searches")
      .then((r) => (r.ok ? r.json() : { savedSearches: [] }))
      .then((d) => setSavedSearches(d.savedSearches ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = useCallback(
    (clickLat: number, clickLng: number) => {
      setSelectedRideId(null);
      setIsUserGps(false);
      setLat(clickLat);
      setLng(clickLng);
      setPickupLabel(`${clickLat.toFixed(3)}, ${clickLng.toFixed(3)}`);
      setOriginQuery("");
      setDestQuery("");
      setUseSpatialFilter(true);
      fetchRides({
        overrideOrigin: "",
        overrideDest: "",
        spatial: true,
        customLat: clickLat,
        customLng: clickLng,
      });
    },
    [fetchRides]
  );

  function showGpsNotice(message: string) {
    setGpsToast(message);
    setTimeout(() => {
      setGpsToast((curr) => (curr === message ? "" : curr));
    }, 5500);
  }

  function handleLocateMe() {
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!window.isSecureContext && !isLocalhost) {
      showGpsNotice(
        "Live GPS requires HTTPS or localhost. On HTTP LAN, tap the map or a city pill to set your pickup."
      );
      return;
    }

    if (!navigator.geolocation) {
      showGpsNotice("Geolocation is not supported by this browser.");
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLng = Number(pos.coords.longitude.toFixed(6));
        setSelectedRideId(null);
        setIsUserGps(true);
        setLat(nextLat);
        setLng(nextLng);
        setPickupLabel(`My Location (${nextLat.toFixed(3)}, ${nextLng.toFixed(3)})`);
        setOriginQuery("");
        setDestQuery("");
        setUseSpatialFilter(true);
        setRecenterNonce((n) => n + 1);
        fetchRides({
          overrideOrigin: "",
          overrideDest: "",
          spatial: true,
          customLat: nextLat,
          customLng: nextLng,
        });
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          showGpsNotice(
            "Location permission denied. Allow location access or tap the map to set pickup."
          );
        } else {
          showGpsNotice(
            "Could not get GPS fix within 10s. Tap the map or select a city pill."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function selectCityPreset(city: (typeof CITY_PRESETS)[number]) {
    setSelectedRideId(null);
    setIsUserGps(false);
    setLat(city.lat);
    setLng(city.lng);
    setPickupLabel(city.name);
    setOriginQuery("");
    setDestQuery("");
    setUseSpatialFilter(true);
    setRecenterNonce((n) => n + 1);
    fetchRides({
      overrideOrigin: "",
      overrideDest: "",
      spatial: true,
      customLat: city.lat,
      customLng: city.lng,
    });
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setUseSpatialFilter(false);
    fetchRides({ spatial: false });
    setSheetSnap("half");

    if (originQuery.trim() && destQuery.trim()) {
      fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originName: originQuery.trim(),
          destName: destQuery.trim(),
        }),
      }).catch(() => {});
    }
  }

  function applyQuickRoute(route: SavedRoute) {
    setOriginQuery(route.originName);
    setDestQuery(route.destName);
    setUseSpatialFilter(false);
    setSheetSnap("half");
    fetchRides({
      overrideOrigin: route.originName,
      overrideDest: route.destName,
      spatial: false,
    });
  }

  const selectRide = useCallback((ride: NearbyRide) => {
    setSelectedRideId(ride.id);
    setLat(ride.originLat);
    setLng(ride.originLng);
    setPickupLabel(ride.originName);
    setSheetSnap("expanded");
  }, []);

  // 60fps GPU Pointer Drag Handlers (ZERO React setState during drag)
  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const el = sheetRef.current;
    if (!el) return;
    draggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartOffsetRef.current = currentOffsetRef.current;
    el.style.transition = "none";
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !sheetRef.current) return;
    e.stopPropagation();
    const vh = window.innerHeight;
    const maxOffset = getSnapOffsetPx("collapsed", vh);
    const delta = e.clientY - dragStartYRef.current;
    const nextOffset = Math.max(
      0,
      Math.min(maxOffset, dragStartOffsetRef.current + delta)
    );
    currentOffsetRef.current = nextOffset;
    sheetRef.current.style.transform = `translate3d(0, ${nextOffset}px, 0)`;
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = false;
    const vh = window.innerHeight;
    const delta = e.clientY - dragStartYRef.current;

    // Tap (tiny movement) cycles snap state
    if (Math.abs(delta) < 8) {
      setSheetSnap((prev) =>
        prev === "collapsed" ? "half" : prev === "half" ? "expanded" : "collapsed"
      );
      return;
    }

    // Snap to closest detent
    const candidates: Array<{ snap: SheetSnap; px: number }> = [
      { snap: "expanded", px: getSnapOffsetPx("expanded", vh) },
      { snap: "half", px: getSnapOffsetPx("half", vh) },
      { snap: "collapsed", px: getSnapOffsetPx("collapsed", vh) },
    ];
    let best = candidates[0];
    for (const c of candidates) {
      if (
        Math.abs(currentOffsetRef.current - c.px) <
        Math.abs(currentOffsetRef.current - best.px)
      ) {
        best = c;
      }
    }
    setSheetSnap(best.snap);
    applySheetTransform(best.snap, true);
  }

  const selectedRide = useMemo(
    () => rides.find((r) => r.id === selectedRideId) ?? null,
    [rides, selectedRideId]
  );

  // Memoize map props so bottom sheet state changes NEVER re-render AlongMap
  const mapCenter = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  const points = useMemo<MapPointItem[]>(
    () => [
      {
        id: "pickup-center",
        lat,
        lng,
        label: isUserGps ? "You" : "Pickup",
        kind: "center",
      },
      ...rides.map((r) => ({
        id: r.id,
        lat: r.originLat,
        lng: r.originLng,
        label: `${r.originName} → ${r.destName}`,
        priceLabel: `${r.price} EGP`,
        selected: selectedRideId === r.id,
        kind: "ride" as const,
        onClick: () => selectRide(r),
      })),
    ],
    [lat, lng, isUserGps, rides, selectedRideId, selectRide]
  );

  const selectedRoute = useMemo<RouteArcItem | null>(
    () =>
      selectedRide
        ? {
            id: selectedRide.id,
            originLat: selectedRide.originLat,
            originLng: selectedRide.originLng,
            destLat: selectedRide.destLat,
            destLng: selectedRide.destLng,
          }
        : null,
    [selectedRide]
  );

  const quickRoutes =
    savedSearches.length > 0 ? savedSearches : DEFAULT_QUICK_ROUTES;

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* ===================================================================== */}
      {/* DESKTOP ZONE 1: Start Side Panel (w-[380px], independent scroll)      */}
      {/* ===================================================================== */}
      <section className="relative z-10 hidden h-full w-[380px] shrink-0 flex-col border-e border-[#DCE3EE] bg-white lg:flex">
        <div className="border-b border-[#DCE3EE] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-[#050412]">
                Find a Ride
              </h1>
              <p className="text-xs text-[#5E6878]">
                Carpool your way · Uber H3 nearby search
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE3EE] bg-[#F7F9FC] px-3 py-1.5 text-xs font-semibold text-[#050412] hover:border-[#1E90FF] hover:text-[#1E90FF]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#1E90FF]" />
              Filters
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-2.5">
            <div className="relative space-y-2">
              <div className="flex items-center gap-2 rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] px-3 py-2 focus-within:border-[#1E90FF] focus-within:bg-white">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1E90FF]" />
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder="From (e.g. Zagazig, New Cairo)"
                  className="w-full bg-transparent text-sm font-medium focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setOriginQuery(destQuery);
                  setDestQuery(originQuery);
                }}
                aria-label="Swap locations"
                className="absolute end-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#DCE3EE] bg-white text-[#1E90FF] shadow-xs hover:bg-[#EBF5FF]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-2 rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] px-3 py-2 focus-within:border-[#1E90FF] focus-within:bg-white">
                <MapPin className="h-4 w-4 shrink-0 text-[#1E90FF]" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Where to? (e.g. Cairo, Smart Village)"
                  className="w-full bg-transparent text-sm font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-[10px] border border-[#DCE3EE] bg-[#F7F9FC] px-2.5 py-1.5 text-xs font-medium"
              />
              <select
                value={ringSize}
                onChange={(e) => {
                  const nextK = Number(e.target.value);
                  setRingSize(nextK);
                  setUseSpatialFilter(true);
                  fetchRides({ spatial: true, customRing: nextK });
                }}
                className="rounded-[10px] border border-[#DCE3EE] bg-[#F7F9FC] px-2 py-1.5 text-xs font-medium"
              >
                <option value={1}>H3 ~5km</option>
                <option value={2}>H3 ~10km</option>
                <option value={3}>H3 ~16km</option>
                <option value={4}>H3 ~25km</option>
              </select>
              <button
                type="submit"
                className="along-btn-primary inline-flex items-center justify-center gap-1 py-1.5 text-xs"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {quickRoutes.slice(0, 3).map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => applyQuickRoute(route)}
                className="inline-flex items-center gap-1 rounded-full bg-[#E9EEF5] px-2.5 py-1 text-[11px] font-semibold text-[#050412] hover:bg-[#EBF5FF] hover:text-[#1E90FF]"
              >
                <Clock className="h-3 w-3 text-[#5E6878]" />
                {route.originName} → {route.destName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-[#F7F9FC] py-3.5 ps-3.5 pe-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5E6878]">
              {loading ? "Searching..." : `${rides.length} Rides Available`}
            </span>
            {(useSpatialFilter || originQuery || destQuery) && (
              <button
                type="button"
                onClick={() => {
                  setOriginQuery("");
                  setDestQuery("");
                  setUseSpatialFilter(false);
                  fetchRides({
                    overrideOrigin: "",
                    overrideDest: "",
                    spatial: false,
                  });
                }}
                className="text-xs font-semibold text-[#1E90FF] hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          {rides.length === 0 && !loading ? (
            <div className="along-card p-6 text-center text-sm text-[#5E6878]">
              No rides match this search. Tap a city pill or{" "}
              <strong className="text-[#050412]">Show all</strong>.
            </div>
          ) : (
            rides.map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                selected={selectedRideId === ride.id}
                onSelect={() => selectRide(ride)}
              />
            ))
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* STATIONARY ISOLATED MAP LAYER (fixed inset-0 z-0 mobile; flex-1 desk) */}
      {/* ===================================================================== */}
      <div className="fixed inset-0 z-0 lg:relative lg:inset-auto lg:h-full lg:flex-1">
        <AlongMap
          center={mapCenter}
          zoom={10}
          recenterNonce={recenterNonce}
          points={points}
          selectedRoute={selectedRoute}
          onMapClick={handleMapClick}
          borderless
        />

        {/* Mobile Floating Top-Start Menu Button (☰) */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open navigation drawer"
          className="absolute start-3 top-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#050412] shadow-md transition active:scale-95 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Floating Top-End Sign In & Register Buttons on Map when logged out */}
        {!user && (
          <div className="absolute end-3 top-3.5 z-20 flex items-center gap-1.5">
            <Link
              href="/login"
              className="rounded-xl border border-[#DCE3EE] bg-white/95 px-3 py-2 text-xs font-bold text-[#050412] shadow-md backdrop-blur transition hover:bg-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[#1E90FF] px-3 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(30,144,255,0.35)] transition hover:bg-[#1574D6]"
            >
              Register
            </Link>
          </div>
        )}

        {/* Floating Pickup Point Pill (sits cleanly below top row on mobile when logged out to prevent overlap) */}
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-16 ${
            !user ? "top-16 lg:top-4" : "top-3.5"
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetSnap("half")}
            className="pointer-events-auto flex max-w-[220px] items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2 text-xs font-bold text-[#050412] shadow-md backdrop-blur transition hover:bg-white sm:max-w-xs"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1E90FF]" />
            <span className="truncate">Pickup: {pickupLabel}</span>
          </button>
        </div>

        {/* Desktop Floating City Presets Bar */}
        <div className="absolute bottom-5 start-4 z-10 hidden flex-wrap gap-1.5 lg:flex">
          {CITY_PRESETS.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => selectCityPreset(city)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                pickupLabel === city.name
                  ? "bg-[#1E90FF] text-white"
                  : "bg-white/95 text-[#050412] hover:bg-white"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* GPS / Secure-Context Toast Banner */}
        {gpsToast && (
          <div className="pointer-events-auto absolute inset-x-4 top-16 z-30 mx-auto max-w-md rounded-2xl border border-[#DCE3EE] bg-[#050412] px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg">
            {gpsToast}
          </div>
        )}

        {/* Floating Locate Me / Recenter Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locatingGps}
          title="Use My Real GPS Location"
          aria-label="Use My Real GPS Location"
          className={`absolute bottom-[35dvh] end-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1E90FF] shadow-md transition hover:bg-[#EBF5FF] active:scale-95 lg:bottom-24 lg:end-3 ${
            locatingGps ? "animate-pulse" : ""
          }`}
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* DESKTOP ZONE 3: End Side Panel (w-[360px], docks when ride selected)  */}
      {/* ===================================================================== */}
      {selectedRideId && (
        <aside className="relative z-10 hidden h-full w-[360px] shrink-0 border-s border-[#DCE3EE] bg-white lg:block">
          <RideDetailPanel
            rideId={selectedRideId}
            onClose={() => setSelectedRideId(null)}
            onBooked={() => fetchRides()}
          />
        </aside>
      )}

      {/* ===================================================================== */}
      {/* MOBILE DECOUPLED 60FPS BOTTOM SHEET LAYER (fixed z-20 pointer-none)   */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden">
        <div
          ref={sheetRef}
          style={{ transform: "translate3d(0, 56dvh, 0)" }}
          className="pointer-events-auto flex h-[88dvh] flex-col rounded-t-3xl bg-white shadow-[0_-8px_32px_rgba(5,4,18,0.14)] will-change-transform"
        >
          {/* Isolated Touch Drag Handle Bar */}
          <div
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            className="flex cursor-grab touch-none select-none flex-col items-center pb-2.5 pt-3 active:cursor-grabbing"
          >
            <div className="h-1 w-10 rounded-full bg-[#DCE3EE]" />
          </div>

          {selectedRideId && sheetSnap === "expanded" ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <RideDetailPanel
                rideId={selectedRideId}
                onClose={() => {
                  setSelectedRideId(null);
                  setSheetSnap("half");
                }}
                onBooked={() => fetchRides()}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              <form onSubmit={handleSearchSubmit} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div
                    onClick={() =>
                      sheetSnap === "collapsed" && setSheetSnap("half")
                    }
                    className="flex flex-1 items-center gap-2 rounded-[14px] border border-[#DCE3EE] bg-[#F7F9FC] px-3.5 py-2.5"
                  >
                    <Search className="h-4 w-4 text-[#1E90FF]" />
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => setDestQuery(e.target.value)}
                      placeholder="Where to?"
                      className="w-full bg-transparent text-sm font-semibold text-[#050412] placeholder-[#8E98A8] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    aria-label="Open filters"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#DCE3EE] bg-white text-[#1E90FF]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {sheetSnap !== "collapsed" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={originQuery}
                      onChange={(e) => setOriginQuery(e.target.value)}
                      placeholder="Pickup city"
                      className="rounded-[12px] border border-[#DCE3EE] bg-[#F7F9FC] px-3 py-2 text-xs font-medium"
                    />
                    <button
                      type="submit"
                      className="along-btn-primary py-2 text-xs"
                    >
                      Find Rides ({rides.length})
                    </button>
                  </div>
                )}
              </form>

              {/* Quick City & Route Pills */}
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => {
                      selectCityPreset(city);
                      setSheetSnap("half");
                    }}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      pickupLabel === city.name
                        ? "bg-[#1E90FF] text-white"
                        : "bg-[#E9EEF5] text-[#050412]"
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
                {quickRoutes.slice(0, 2).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => applyQuickRoute(r)}
                    className="shrink-0 rounded-full border border-[#DCE3EE] bg-white px-3 py-1 text-xs font-semibold text-[#5E6878]"
                  >
                    {r.originName} → {r.destName}
                  </button>
                ))}
              </div>

              {/* Scrollable Matching Ride Cards (overscroll-contain prevents drag conflict) */}
              <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-6">
                {rides.length === 0 && !loading ? (
                  <p className="py-6 text-center text-xs text-[#5E6878]">
                    No rides found. Tap a city pill or clear filters.
                  </p>
                ) : (
                  rides.map((ride) => (
                    <RideCard
                      key={ride.id}
                      ride={ride}
                      selected={selectedRideId === ride.id}
                      onSelect={() => selectRide(ride)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        onApply={() => fetchRides()}
      />
    </div>
  );
}
