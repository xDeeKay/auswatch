"use client";

import dynamic from "next/dynamic";

const TicketLocationMap = dynamic(() => import("./TicketLocationMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-label text-sm text-foreground/50">
      Loading map&hellip;
    </div>
  ),
});

export default TicketLocationMap;
