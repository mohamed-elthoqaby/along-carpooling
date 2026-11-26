"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Moon, Sun } from "lucide-react";

export interface MapPointItem {
  id: string;
  lat: number;
  lng: number;
  label: string;
  priceLabel?: string;
  selected?: boolean;
  kind?: "ride" | "center" | "origin" | "dest";
  onClick?: () => void;
}

export interface RouteArcItem {
  id: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export interface AlongMapProps {
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  recenterNonce?: number;
  points?: MapPointItem[];
  selectedRoute?: RouteArcItem | null;
  onMapClick?: (lat: number, lng: number) => void;
  heightClass?: string;
  borderless?: boolean;
  showControls?: boolean;
}

const VECTOR_STYLES = {
  light: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const ROUTE_SOURCE_ID = "along-route-source";
const ROUTE_CASING_LAYER_ID = "along-route-casing";
const ROUTE_LINE_LAYER_ID = "along-route-line";
const ENDPOINTS_SOURCE_ID = "along-endpoints-source";
const ENDPOINTS_LAYER_ID = "along-endpoints-layer";

function createUserPinElement(tagText: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.pointerEvents = "none";

  const ring = document.createElement("div");
  ring.style.width = "34px";
  ring.style.height = "34px";
  ring.style.borderRadius = "9999px";
  ring.style.background = "rgba(30, 144, 255, 0.22)";
  ring.style.display = "flex";
  ring.style.alignItems = "center";
  ring.style.justifyContent = "center";

  const core = document.createElement("div");
  core.style.width = "14px";
  core.style.height = "14px";
  core.style.borderRadius = "9999px";
  core.style.background = "#050412";
  core.style.border = "3px solid #FFFFFF";
  core.style.boxShadow = "0 2px 8px rgba(5,4,18,0.35)";
  ring.appendChild(core);

  const badge = document.createElement("span");
  badge.textContent = tagText;
  badge.style.marginTop = "2px";
  badge.style.padding = "1px 7px";
  badge.style.borderRadius = "9999px";
  badge.style.background = "#050412";
  badge.style.color = "#FFFFFF";
  badge.style.fontSize = "10px";
  badge.style.fontWeight = "700";
  badge.style.letterSpacing = "0.02em";
  badge.style.boxShadow = "0 2px 6px rgba(5,4,18,0.25)";

  wrap.appendChild(ring);
  wrap.appendChild(badge);
  return wrap;
}

function createPricePillElement(point: MapPointItem): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = point.label;
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.gap = "5px";
  btn.style.padding = "5px 10px";
  btn.style.borderRadius = "9999px";
  btn.style.fontSize = "12px";
  btn.style.fontWeight = "800";
  btn.style.cursor = "pointer";
  btn.style.whiteSpace = "nowrap";
  btn.style.transition = "transform 120ms ease, box-shadow 120ms ease";
  btn.style.border = point.selected ? "2px solid #FFFFFF" : "2px solid #1E90FF";
  btn.style.background = point.selected ? "#1E90FF" : "#FFFFFF";
  btn.style.color = point.selected ? "#FFFFFF" : "#050412";
  btn.style.boxShadow = point.selected
    ? "0 6px 18px rgba(30, 144, 255, 0.45)"
    : "0 3px 10px rgba(5, 4, 18, 0.16)";
  btn.style.transform = point.selected ? "scale(1.08)" : "scale(1)";

  const iconColor = point.selected ? "#FFFFFF" : "#1E90FF";
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg><span>${point.priceLabel ?? point.label}</span>`;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    point.onClick?.();
  });

  return btn;
}

const AlongMapInner = memo(function AlongMapInner({
  center = [30.5877, 31.502],
  zoom = 11,
  recenterNonce = 0,
  points = [],
  selectedRoute = null,
  onMapClick,
  heightClass = "h-96",
  borderless = false,
  showControls = true,
}: AlongMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const clickCallbackRef = useRef(onMapClick);
  clickCallbackRef.current = onMapClick;

  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [roadPath, setRoadPath] = useState<[number, number][] | null>(null);

  const roadPathRef = useRef<[number, number][] | null>(null);
  roadPathRef.current = roadPath;
  const pointsRef = useRef<MapPointItem[]>(points);
  pointsRef.current = points;
  const selectedRouteRef = useRef<RouteArcItem | null>(selectedRoute);
  selectedRouteRef.current = selectedRoute;
  const themeRef = useRef<"light" | "dark">(mapTheme);
  themeRef.current = mapTheme;

  // Sync native GPU GeoJSON sources & layers (runs on style.load and data updates)
  const syncNativeLayers = useCallback((map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;

    const coords = roadPathRef.current;
    const routeGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        coords && coords.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: coords,
                },
              },
            ]
          : [],
    };

    const existingRoute = map.getSource(ROUTE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (existingRoute) {
      existingRoute.setData(routeGeoJson);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeGeoJson,
      });

      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": themeRef.current === "dark" ? "#050412" : "#FFFFFF",
          "line-width": 8,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#1E90FF",
          "line-width": 4.5,
          "line-opacity": 1,
        },
      });
    }

    // Native GPU endpoint circles (Origin = Green, Dest = Red)
    const endpointFeatures: GeoJSON.Feature[] = [];
    for (const p of pointsRef.current) {
      if (p.kind === "origin" || p.kind === "dest") {
        endpointFeatures.push({
          type: "Feature",
          properties: { color: p.kind === "dest" ? "#DC2626" : "#16A34A" },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        });
      }
    }
    if (selectedRouteRef.current) {
      endpointFeatures.push(
        {
          type: "Feature",
          properties: { color: "#16A34A" },
          geometry: {
            type: "Point",
            coordinates: [
              selectedRouteRef.current.originLng,
              selectedRouteRef.current.originLat,
            ],
          },
        },
        {
          type: "Feature",
          properties: { color: "#DC2626" },
          geometry: {
            type: "Point",
            coordinates: [
              selectedRouteRef.current.destLng,
              selectedRouteRef.current.destLat,
            ],
          },
        }
      );
    }

    const endpointsGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: endpointFeatures,
    };

    const existingEndpoints = map.getSource(ENDPOINTS_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (existingEndpoints) {
      existingEndpoints.setData(endpointsGeoJson);
    } else {
      map.addSource(ENDPOINTS_SOURCE_ID, {
        type: "geojson",
        data: endpointsGeoJson,
      });
      map.addLayer({
        id: ENDPOINTS_LAYER_ID,
        type: "circle",
        source: ENDPOINTS_SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.5,
        },
      });
    }
  }, []);

  // Initialize MapLibre GL JS (Pure Vector Tiles, Google Maps Ergonomics)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof maplibregl.setWorkerUrl === "function") {
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: VECTOR_STYLES.light,
      center: [center[1], center[0]],
      zoom,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      maxPitch: 0,
      attributionControl: false,
      fadeDuration: 150,
      pixelRatio:
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio || 1, 2)
          : 1,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    if (showControls) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );
    }

    map.on("style.load", () => {
      syncNativeLayers(map);
    });

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      if (clickCallbackRef.current) {
        clickCallbackRef.current(
          Number(e.lngLat.lat.toFixed(6)),
          Number(e.lngLat.lng.toFixed(6))
        );
      }
    });

    mapRef.current = map;

    return () => {
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      try {
        map.remove();
      } catch {
        // Ignore cleanup race
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch OpenFreeMap Light / Dark vector style cleanly
  const isFirstThemeRef = useRef(true);
  useEffect(() => {
    if (isFirstThemeRef.current) {
      isFirstThemeRef.current = false;
      return;
    }
    if (!mapRef.current) return;
    mapRef.current.setStyle(VECTOR_STYLES[mapTheme]);
  }, [mapTheme]);

  // Smooth recenter when no route is active
  useEffect(() => {
    if (!mapRef.current || selectedRoute) return;
    mapRef.current.easeTo({
      center: [center[1], center[0]],
      duration: 420,
    });
  }, [center[0], center[1], recenterNonce, selectedRoute]);

  // Fetch real road-following OSRM route when selectedRoute changes
  useEffect(() => {
    if (!selectedRoute) {
      setRoadPath(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      originLat: String(selectedRoute.originLat),
      originLng: String(selectedRoute.originLng),
      destLat: String(selectedRoute.destLat),
      destLng: String(selectedRoute.destLng),
    });

    fetch(`/api/route?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const coords: [number, number][] =
          Array.isArray(data?.coordinates) && data.coordinates.length >= 2
            ? data.coordinates
            : [
                [selectedRoute.originLng, selectedRoute.originLat],
                [selectedRoute.destLng, selectedRoute.destLat],
              ];
        setRoadPath(coords);

        if (mapRef.current && coords.length >= 2) {
          const bounds = new maplibregl.LngLatBounds();
          for (const [lng, lat] of coords) {
            bounds.extend([lng, lat]);
          }
          mapRef.current.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 56, right: 56 },
            duration: 500,
            maxZoom: 13,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoadPath([
            [selectedRoute.originLng, selectedRoute.originLat],
            [selectedRoute.destLng, selectedRoute.destLat],
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedRoute?.id,
    selectedRoute?.originLat,
    selectedRoute?.originLng,
    selectedRoute?.destLat,
    selectedRoute?.destLng,
  ]);

  // Update native GeoJSON layers whenever path or points change
  useEffect(() => {
    if (!mapRef.current) return;
    syncNativeLayers(mapRef.current);
  }, [roadPath, points, selectedRoute, syncNativeLayers]);

  // ResizeObserver for smooth desktop side-panel transitions
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render crisp DOM Markers (single User/Pickup pin + clickable Price Pill Markers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    const centerPoint = points.find((p) => p.kind === "center");
    if (centerPoint) {
      const el = createUserPinElement(centerPoint.label || "Pickup");
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    for (const p of points) {
      if (p.kind !== "ride") continue;
      const el = createPricePillElement(p);
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [points]);

  return (
    <div
      className={`relative w-full overflow-hidden ${
        borderless
          ? "h-full"
          : `rounded-[16px] border border-[#DCE3EE] shadow-[0_2px_8px_rgba(5,4,18,0.06)] ${heightClass}`
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Crisp Light / Dark Vector Style Toggle */}
      <button
        type="button"
        onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
        title={`Switch to ${mapTheme === "light" ? "Dark" : "Light"} map`}
        aria-label="Toggle map style"
        className="absolute bottom-[42dvh] end-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE3EE] bg-white/95 text-[#050412] shadow-md backdrop-blur transition hover:bg-white active:scale-95 lg:bottom-36 lg:end-3"
      >
        {mapTheme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4 text-[#F59E0B]" />
        )}
      </button>
    </div>
  );
});

export default AlongMapInner;
