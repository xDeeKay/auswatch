"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./map-theme.css";
import { MapContainer, Marker, ZoomControl, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CameraStatus, CameraType } from "@/generated/prisma/enums";
import type { PublicCamera } from "@/lib/cameras";
import { TYPE_COLOR } from "@/lib/camera-labels";
import { AUSTRALIA_BOUNDS, AUSTRALIA_MAX_BOUNDS, MIN_ZOOM, MAX_ZOOM, WHEEL_PX_PER_ZOOM_LEVEL } from "@/lib/map-constants";
import { VectorBasemap } from "@/components/VectorBasemap";
import { FitBounds } from "@/components/FitBounds";
import { MapFlyTo, type FlyTarget } from "@/components/MapFlyTo";

const FIT_PADDING = { padding: [20, 20] as [number, number] };

const STATUS_SHAPE_CLASS: Record<CameraStatus, string> = {
  [CameraStatus.active]: "auswatch-marker-solid",
  [CameraStatus.removed]: "auswatch-marker-hollow",
  [CameraStatus.unconfirmed]: "auswatch-marker-dashed",
};

function markerIcon(camera: PublicCamera, selected: boolean) {
  const color = TYPE_COLOR[camera.type as CameraType];
  const shapeClass = STATUS_SHAPE_CLASS[camera.status];
  return L.divIcon({
    className: "auswatch-marker",
    html: `<span class="auswatch-marker-dot ${shapeClass}${selected ? " auswatch-marker-selected" : ""}" style="--marker-color:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function clusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<div class="auswatch-cluster">${cluster.getChildCount()}</div>`,
    className: "auswatch-cluster-wrapper",
    iconSize: L.point(36, 36, true),
  });
}

// With animate={false}, leaflet.markercluster's own zoom-end bookkeeping
// (integer-zoom-indexed) can fall out of sync with the map's actual
// fractional zoom (zoomSnap=0.1 below) and leave a stale cluster icon on the
// map after its children have already been shown individually. A full
// clear+re-add rebuilds the cluster tree from scratch against the current
// zoom, which is cheap here (a handful of markers) and guarantees no
// leftover icon can survive a zoom transition.
function ClusterZoomSync({ clusterRef }: { clusterRef: React.RefObject<L.MarkerClusterGroup | null> }) {
  const map = useMap();

  useEffect(() => {
    function resync() {
      const group = clusterRef.current;
      if (!group) return;
      const layers = group.getLayers();
      group.clearLayers();
      group.addLayers(layers);
    }
    map.on("zoomend", resync);
    return () => {
      map.off("zoomend", resync);
    };
  }, [map, clusterRef]);

  return null;
}

export default function MapView({
  cameras,
  selectedId,
  onSelect,
  onBasemapReady,
  flyTarget,
}: {
  cameras: PublicCamera[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBasemapReady?: () => void;
  flyTarget?: FlyTarget | null;
}) {
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  return (
    <MapContainer
      center={[-25.2744, 133.7751]}
      zoom={MIN_ZOOM}
      maxBounds={AUSTRALIA_MAX_BOUNDS}
      maxBoundsViscosity={0.7}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomSnap={0.1}
      wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
      preferCanvas
      zoomControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="bottomleft" />
      <FitBounds bounds={AUSTRALIA_BOUNDS} options={FIT_PADDING} />
      <VectorBasemap onReady={onBasemapReady} />
      <MapFlyTo target={flyTarget ?? null} />
      <ClusterZoomSync clusterRef={clusterRef} />
      <MarkerClusterGroup ref={clusterRef} iconCreateFunction={clusterIcon} animate={false}>
        {cameras.map((camera) => (
          <Marker
            key={camera.id}
            position={[camera.lat, camera.lng]}
            icon={markerIcon(camera, camera.id === selectedId)}
            eventHandlers={{ click: () => onSelect(camera.id) }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
