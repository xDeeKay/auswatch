"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./map-theme.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CameraStatus, CameraType, CaptureType } from "@/generated/prisma/enums";
import type { PublicCamera } from "@/lib/cameras";

const STATUS_COLOR: Record<CameraStatus, string> = {
  [CameraStatus.active]: "#C1443D",
  [CameraStatus.removed]: "#5B8266",
  [CameraStatus.unconfirmed]: "#6E7B86",
};

const STATUS_LABEL: Record<CameraStatus, string> = {
  [CameraStatus.active]: "Active",
  [CameraStatus.removed]: "Removed",
  [CameraStatus.unconfirmed]: "Unconfirmed",
};

const TYPE_LABEL: Record<CameraType, string> = {
  [CameraType.alpr]: "ALPR / plate reader",
  [CameraType.facial]: "Facial recognition",
  [CameraType.cctv]: "CCTV",
  [CameraType.speed]: "Speed camera",
  [CameraType.other]: "Other",
};

const CAPTURE_LABEL: Record<CaptureType, string> = {
  [CaptureType.plates]: "number plates",
  [CaptureType.faces]: "faces",
  [CaptureType.both]: "plates and faces",
  [CaptureType.general]: "general footage",
  [CaptureType.unclear]: "unclear",
};

function markerIcon(status: CameraStatus) {
  return L.divIcon({
    className: "auswatch-marker",
    html: `<span class="auswatch-marker-dot" style="background:${STATUS_COLOR[status]}"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function clusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<div class="auswatch-cluster">${cluster.getChildCount()}</div>`,
    className: "auswatch-cluster-wrapper",
    iconSize: L.point(36, 36, true),
  });
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function MapView({ cameras }: { cameras: PublicCamera[] }) {
  return (
    <MapContainer
      center={[-25.2744, 133.7751]}
      zoom={4}
      minZoom={3}
      className="h-full w-full"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
      />
      <MarkerClusterGroup iconCreateFunction={clusterIcon}>
        {cameras.map((camera) => (
          <Marker
            key={camera.id}
            position={[camera.lat, camera.lng]}
            icon={markerIcon(camera.status)}
          >
            <Popup className="auswatch-popup">
              <h3>{TYPE_LABEL[camera.type]}</h3>
              <dl>
                <dt>OPERATOR</dt>
                <dd>{camera.operator}</dd>
                <dt>APPEARS TO CAPTURE</dt>
                <dd>{CAPTURE_LABEL[camera.captures]}</dd>
                <dt>STATUS</dt>
                <dd>{STATUS_LABEL[camera.status]}</dd>
                <dt>FIRST SIGHTED</dt>
                <dd>{dateFormatter.format(camera.createdAt)}</dd>
                {camera.notes && (
                  <>
                    <dt>NOTES</dt>
                    <dd>{camera.notes}</dd>
                  </>
                )}
              </dl>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
