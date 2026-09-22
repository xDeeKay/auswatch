"use client";

import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./LocationPickerView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-label text-sm text-parchment/50">
      Loading map&hellip;
    </div>
  ),
});

export default LocationPicker;
