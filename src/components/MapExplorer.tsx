"use client";

import { useMemo, useState, type CSSProperties } from "react";
import MapView from "@/components/MapView";
import { MapSearch } from "@/components/MapSearch";
import { MapLoadingOverlay } from "@/components/MapLoadingOverlay";
import type { FlyTarget } from "@/components/MapFlyTo";
import { AuState, CameraStatus, CameraType, OperatorCategory } from "@/generated/prisma/enums";
import type { PublicCamera } from "@/lib/cameras";
import {
  CAPTURE_LABEL,
  OPERATOR_CATEGORY_LABEL,
  STATE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  TYPE_COLOR,
  TYPE_LABEL,
  TYPE_ORDER,
} from "@/lib/camera-labels";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";

const STATUS_ORDER: CameraStatus[] = [CameraStatus.active, CameraStatus.removed];

const OPERATOR_CATEGORY_ORDER: OperatorCategory[] = [
  OperatorCategory.state_police,
  OperatorCategory.local_council,
  OperatorCategory.transport_authority,
  OperatorCategory.private,
  OperatorCategory.unknown,
];

const STATE_ORDER: (AuState | null)[] = [
  AuState.act,
  AuState.nsw,
  AuState.nt,
  AuState.qld,
  AuState.sa,
  AuState.tas,
  AuState.vic,
  AuState.wa,
  null,
];

function stateLabel(state: AuState | null): string {
  return state ? STATE_LABEL[state] : "Unresolved";
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function chipClass(active: boolean) {
  return `flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-left font-label text-xs transition ${
    active
      ? "border-amber/50 bg-amber/10 text-foreground"
      : "border-foreground/15 text-foreground/40 hover:border-foreground/30 hover:text-foreground/70"
  }`;
}

/** Like chipClass, but the active state is tinted with the chip's own color instead of amber. */
function accentChipProps(active: boolean, color: string): { className: string; style?: CSSProperties } {
  const className = `flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-left font-label text-xs transition ${
    active
      ? "text-foreground"
      : "border-foreground/15 text-foreground/40 hover:border-foreground/30 hover:text-foreground/70"
  }`;
  return active ? { className, style: { borderColor: `${color}80`, backgroundColor: `${color}1A` } } : { className };
}

export default function MapExplorer({ cameras }: { cameras: PublicCamera[] }) {
  const [activeTypes, setActiveTypes] = useState<Set<CameraType>>(new Set(TYPE_ORDER));
  const [activeStatuses, setActiveStatuses] = useState<Set<CameraStatus>>(new Set(STATUS_ORDER));
  const [activeOperatorCategories, setActiveOperatorCategories] = useState<Set<OperatorCategory>>(
    new Set(OPERATOR_CATEGORY_ORDER)
  );
  const [activeStates, setActiveStates] = useState<Set<AuState | null>>(new Set(STATE_ORDER));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemapReady, setBasemapReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

  const yearRange = useMemo(() => {
    const years = cameras.map((c) => c.createdAt.getFullYear());
    const min = years.length ? Math.min(...years) : new Date().getFullYear();
    const max = years.length ? Math.max(...years) : new Date().getFullYear();
    return { min, max };
  }, [cameras]);

  const [sinceYear, setSinceYear] = useState<number>(yearRange.min);

  const filteredCameras = useMemo(() => {
    return cameras.filter(
      (camera) =>
        activeTypes.has(camera.type) &&
        activeStatuses.has(camera.status) &&
        activeOperatorCategories.has(camera.operatorCategory) &&
        activeStates.has(camera.state) &&
        camera.createdAt.getFullYear() >= sinceYear
    );
  }, [cameras, activeTypes, activeStatuses, activeOperatorCategories, activeStates, sinceYear]);

  const selectedCamera = filteredCameras.find((camera) => camera.id === selectedId) ?? null;

  function toggleType(type: CameraType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleStatus(status: CameraStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleOperatorCategory(category: OperatorCategory) {
    setActiveOperatorCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleState(state: AuState | null) {
    setActiveStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  return (
    <div className="relative flex h-full">
      <aside
        className={`absolute inset-y-0 left-0 z-[1300] flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-foreground/10 bg-surface p-4 transition-transform duration-200 desktop:static desktop:translate-x-0 ${
          filtersOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-label text-xs text-amber">FILTERS</span>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close"
            className="font-label text-lg text-foreground/40 hover:text-foreground desktop:hidden"
          >
            &times;
          </button>
        </div>

        <div className="-mt-2 flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <Label>STATUS</Label>
          {STATUS_ORDER.map((status) => {
            const count = cameras.filter((c) => c.status === status).length;
            const { className, style } = accentChipProps(activeStatuses.has(status), STATUS_COLOR[status]);
            return (
              <button key={status} type="button" onClick={() => toggleStatus(status)} className={className} style={style}>
                <span className="capitalize">{STATUS_LABEL[status]}</span>
                <span className="text-foreground/40">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <Label>CAMERA TYPE</Label>
          {TYPE_ORDER.map((type) => {
            const count = cameras.filter((c) => c.type === type).length;
            const { className, style } = accentChipProps(activeTypes.has(type), TYPE_COLOR[type]);
            return (
              <button key={type} type="button" onClick={() => toggleType(type)} className={className} style={style}>
                <span className="capitalize">{TYPE_LABEL[type]}</span>
                <span className="text-foreground/40">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <Label>OPERATOR CATEGORY</Label>
          {OPERATOR_CATEGORY_ORDER.map((category) => {
            const count = cameras.filter((c) => c.operatorCategory === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleOperatorCategory(category)}
                className={chipClass(activeOperatorCategories.has(category))}
              >
                <span className="capitalize">{OPERATOR_CATEGORY_LABEL[category]}</span>
                <span className="text-foreground/40">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4">
          <Label>STATE/TERRITORY</Label>
          {STATE_ORDER.map((state) => {
            const count = cameras.filter((c) => c.state === state).length;
            return (
              <button
                key={state ?? "unresolved"}
                type="button"
                onClick={() => toggleState(state)}
                className={chipClass(activeStates.has(state))}
              >
                <span className="capitalize">{stateLabel(state)}</span>
                <span className="text-foreground/40">{count}</span>
              </button>
            );
          })}
        </div>

        {yearRange.min < yearRange.max && (
          <div className="flex flex-col gap-1 border-t border-foreground/10 pt-4">
            <Label>ADDED SINCE</Label>
            <input
              type="range"
              min={yearRange.min}
              max={yearRange.max}
              value={sinceYear}
              onChange={(e) => setSinceYear(Number(e.target.value))}
              className="accent-amber"
            />
            <p className="font-label text-xs text-foreground/50">{sinceYear}</p>
          </div>
        )}

        <p className="mt-auto border-t border-foreground/10 pt-3 font-label text-xs text-foreground/50">
          {filteredCameras.length} of {cameras.length} devices shown
        </p>
      </aside>

      {filtersOpen && (
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
          className="absolute inset-0 z-[1200] border-0 bg-surface/70 p-0 desktop:hidden"
        />
      )}

      <div className="auswatch-map-frame flex-1">
        <MapView
          cameras={filteredCameras}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBasemapReady={() => setBasemapReady(true)}
          flyTarget={flyTarget}
        />

        <MapLoadingOverlay ready={basemapReady} />

        <div className="absolute left-3 top-3 z-[900]">
          <MapSearch onSelect={setFlyTarget} />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="absolute right-3 top-3 z-[900] rounded border border-foreground/20 bg-surface/90 px-3 py-1.5 font-label text-xs text-foreground shadow desktop:hidden"
        >
          Filters
        </button>

        {selectedCamera && (
          <div className="absolute inset-0 z-[1100] flex flex-col gap-4 overflow-y-auto border-l border-foreground/10 bg-surface p-5 desktop:inset-y-0 desktop:inset-x-auto desktop:right-0 desktop:w-80 desktop:bg-surface/95">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-heading text-base text-foreground">{TYPE_LABEL[selectedCamera.type]}</h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="font-label text-lg text-foreground/40 hover:text-foreground"
              >
                &times;
              </button>
            </div>

            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="font-label text-xs text-foreground/50">STATUS</dt>
                <dd className="text-foreground/85">{STATUS_LABEL[selectedCamera.status]}</dd>
              </div>
              <div>
                <dt className="font-label text-xs text-foreground/50">APPEARS TO CAPTURE</dt>
                <dd className="text-foreground/85">{CAPTURE_LABEL[selectedCamera.captures]}</dd>
              </div>
              <div>
                <dt className="font-label text-xs text-foreground/50">OPERATOR CATEGORY</dt>
                <dd className="text-foreground/85">{OPERATOR_CATEGORY_LABEL[selectedCamera.operatorCategory]}</dd>
              </div>
              {selectedCamera.operator && (
                <div>
                  <dt className="font-label text-xs text-foreground/50">OWNER / OPERATOR</dt>
                  <dd className="text-foreground/85">{selectedCamera.operator}</dd>
                </div>
              )}
              <div>
                <dt className="font-label text-xs text-foreground/50">STATE/TERRITORY</dt>
                <dd className="text-foreground/85">
                  {selectedCamera.state ? STATE_LABEL[selectedCamera.state] : "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-foreground/50">COORDINATES</dt>
                <dd className="font-label text-foreground/85">
                  {selectedCamera.lat.toFixed(4)}, {selectedCamera.lng.toFixed(4)}
                </dd>
              </div>
              <div>
                <dt className="font-label text-xs text-foreground/50">FIRST SIGHTED</dt>
                <dd className="font-label text-foreground/85">{dateFormatter.format(selectedCamera.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-auto flex flex-col gap-2">
              <Button href={`/cameras/${selectedCamera.id}`} size="sm">
                View full record
              </Button>
              <Button href={`/report/correction/${selectedCamera.id}`} tone="secondary" size="sm">
                Suggest a correction
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
