"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the map component with SSR disabled
// Leaflet uses the `window` object heavily, which crashes during Next.js SSR build
const MapPinDynamic = dynamic(() => import("./MapPinDynamic"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
    </div>
  ),
});

export default MapPinDynamic;
