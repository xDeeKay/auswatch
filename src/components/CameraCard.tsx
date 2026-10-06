"use client";

import type { PublicCamera } from "@/lib/cameras";
import { getStreetViewUrl } from "@/lib/street-view";
import {
  CAPTURE_LABEL,
  OPERATOR_CATEGORY_LABEL,
  STATE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  DEPLOYMENT_LABEL,
  TYPE_LABEL,
  typeColorFor,
} from "@/lib/camera-labels";
import { Button } from "@/components/ui/Button";
import { CloseButton } from "@/components/ui/CloseButton";
import { useResolvedTheme } from "@/components/useResolvedTheme";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

// Leaflet styles every anchor inside its container, which outranks the plain
// tone colours on Button, so the card's links restate them as important.
const LINK_COLOR = {
  primary: "!text-amber",
  secondary: "!text-foreground/70 hover:!text-amber",
};

function Fact({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <>
      <dt className="font-label text-xs leading-5 text-foreground/50">{label}</dt>
      <dd className={`leading-5 text-foreground/85 ${mono ? "font-label" : ""}`}>{children}</dd>
    </>
  );
}

export function CameraCard({ camera, onClose }: { camera: PublicCamera; onClose: () => void }) {
  const typeColor = typeColorFor(useResolvedTheme());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-base text-foreground">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: typeColor[camera.type] }}
          />
          {TYPE_LABEL[camera.type]}
        </h2>
        <CloseButton onClick={onClose} label="Close" className="-mr-2 h-8 w-8" />
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm">
        <Fact label="STATUS">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[camera.status] }}
            />
            {STATUS_LABEL[camera.status]}
          </span>
        </Fact>
        <Fact label="DEPLOYMENT">{DEPLOYMENT_LABEL[camera.deployment]}</Fact>
        <Fact label="APPEARS TO CAPTURE">{CAPTURE_LABEL[camera.captures]}</Fact>
        <Fact label="OPERATOR CATEGORY">{OPERATOR_CATEGORY_LABEL[camera.operatorCategory]}</Fact>
        <Fact label="STATE/TERRITORY">{camera.state ? STATE_LABEL[camera.state] : "Unknown"}</Fact>
        <Fact label="OWNER / OPERATOR">{camera.operator || "Unknown"}</Fact>
        <Fact label="ADDED" mono>
          {dateFormatter.format(camera.createdAt)}
        </Fact>
        <Fact label="COORDINATES" mono>
          {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
        </Fact>
      </dl>

      <div className="flex flex-col gap-2">
        <Button href={`/cameras/${camera.id}`} size="sm" className={LINK_COLOR.primary}>
          View full record
        </Button>
        <Button href={getStreetViewUrl(camera.lat, camera.lng)} tone="secondary" size="sm" className={LINK_COLOR.secondary}>
          Open in Street View
        </Button>
        <Button href={`/report/correction/${camera.id}`} tone="secondary" size="sm" className={LINK_COLOR.secondary}>
          Suggest a correction
        </Button>
      </div>
    </div>
  );
}
