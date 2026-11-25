"use client";

import { memo, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";

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

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

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
  zoom = 10,
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
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const clickCallbackRef = useRef(onMapClick);
  clickCallbackRef.current = onMapClick;

  const [roadPath, setRoadPath] = useState<[number, number][] | null>(null);

  // Initialize MapLibre GL + deck.gl overlay once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (typeof maplibregl.setWorkerUrl === "function") {
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [center[1], center[0]],
      zoom,
      attributionControl: { compact: true },
    });

    if (showControls) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );
    }

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });
    map.addControl(overlay as unknown as maplibregl.IControl);

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      if (clickCallbackRef.current) {
        clickCallbackRef.current(
          Number(e.lngLat.lat.toFixed(6)),
          Number(e.lngLat.lng.toFixed(6))
        );
      }
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      try {
        overlay.finalize();
      } catch {
        // Ignore cleanup race
      }
      try {
        map.remove();
      } catch {
        // Ignore cleanup race
      }
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter smoothly when center/recenterNonce changes (when no route is active)
  useEffect(() => {
    if (!mapRef.current || selectedRoute) return;
    mapRef.current.easeTo({
      center: [center[1], center[0]],
      duration: 420,
    });
  }, [center[0], center[1], recenterNonce, selectedRoute]);

  // Fetch real road-following OSRM route via /api/route when selectedRoute changes
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
            padding: { top: 72, bottom: 72, left: 64, right: 64 },
            duration: 550,
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

  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render distinct MapLibre DOM Markers:
  // - Single User/Pickup pin (#050412 + translucent blue halo + "You"/"Pickup")
  // - Clickable Price Pill Markers for nearby rides ("95 EGP", "75 EGP", etc.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];

    // Ensure at most ONE user/center marker
    const centerPoint = points.find((p) => p.kind === "center");
    if (centerPoint) {
      const el = createUserPinElement(centerPoint.label || "Pickup");
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([centerPoint.lng, centerPoint.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Price Pill markers for nearby rides
    for (const p of points) {
      if (p.kind !== "ride") continue;
      const el = createPricePillElement(p);
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [points]);

  // Update deck.gl PathLayer (real road route) + origin/dest endpoint dots
  useEffect(() => {
    if (!overlayRef.current) return;

    const endpointPoints: MapPointItem[] = points.filter(
      (p) => p.kind === "origin" || p.kind === "dest"
    );

    if (selectedRoute) {
      endpointPoints.push(
        {
          id: `${selectedRoute.id}-route-origin`,
          lat: selectedRoute.originLat,
          lng: selectedRoute.originLng,
          label: "Pickup",
          kind: "origin",
        },
        {
          id: `${selectedRoute.id}-route-dest`,
          lat: selectedRoute.destLat,
          lng: selectedRoute.destLng,
          label: "Drop-off",
          kind: "dest",
        }
      );
    }

    const pathData = roadPath ? [{ path: roadPath }] : [];

    const layers = [
      ...(pathData.length > 0
        ? [
            new PathLayer<{ path: [number, number][] }>({
              id: "along-route-casing-layer",
              data: pathData,
              getPath: (d) => d.path,
              getColor: [255, 255, 255, 245],
              widthUnits: "pixels",
              getWidth: 8,
              widthMinPixels: 7,
              capRounded: true,
              jointRounded: true,
            }),
            new PathLayer<{ path: [number, number][] }>({
              id: "along-route-path-layer",
              data: pathData,
              getPath: (d) => d.path,
              getColor: [30, 144, 255, 255],
              widthUnits: "pixels",
              getWidth: 5,
              widthMinPixels: 4,
              capRounded: true,
              jointRounded: true,
            }),
          ]
        : []),
      ...(endpointPoints.length > 0
        ? [
            new ScatterplotLayer<MapPointItem>({
              id: "along-endpoints-layer",
              data: endpointPoints,
              stroked: true,
              filled: true,
              radiusUnits: "pixels",
              getPosition: (d) => [d.lng, d.lat],
              getRadius: 9,
              getFillColor: (d) =>
                d.kind === "dest" ? [220, 38, 38, 245] : [22, 163, 74, 245],
              getLineColor: [255, 255, 255, 255],
              lineWidthMinPixels: 2.5,
            }),
          ]
        : []),
    ];

    overlayRef.current.setProps({ layers });
  }, [points, selectedRoute, roadPath]);

  return (
    <div
      className={`relative w-full overflow-hidden ${
        borderless
          ? "h-full"
          : `rounded-[16px] border border-[#DCE3EE] shadow-[0_2px_8px_rgba(5,4,18,0.06)] ${heightClass}`
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

export default AlongMapInner;
