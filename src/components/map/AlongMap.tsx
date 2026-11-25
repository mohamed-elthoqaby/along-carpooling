"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import type {
  AlongMapProps,
  MapPointItem,
  RouteArcItem,
} from "./AlongMapInner";

export type { AlongMapProps, MapPointItem, RouteArcItem };

const DynamicAlongMap = dynamic(() => import("./AlongMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] w-full items-center justify-center bg-[#E9EEF5] text-sm font-medium text-[#5E6878]">
      Loading Along Map...
    </div>
  ),
});

export const AlongMap = memo(function AlongMap(props: AlongMapProps) {
  return <DynamicAlongMap {...props} />;
});
