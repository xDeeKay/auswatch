"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./map-theme.css";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CameraStatus } from "@/generated/prisma/enums";
import type { PublicCamera } from "@/lib/cameras";
import { STATUS_COLOR, STATUS_LABEL, TYPE_LABEL, CAPTURE_LABEL, HISTORY_EVENT_LABEL } from "@/lib/camera-labels";
import { AUSTRALIA_CENTER, DEFAULT_ZOOM, MIN_ZOOM, DARK_TILE_URL, DARK_TILE_ATTRIBUTION } from "@/lib/map-constants";

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
      center={AUSTRALIA_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      className="h-full w-full"
    >
      <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
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

              {camera.history.length > 0 && (
                <>
                  <p className="auswatch-timeline-heading">HISTORY</p>
                  <ol className="auswatch-timeline">
                    {camera.history.map((event) => (
                      <li key={event.id}>
                        <span className="auswatch-timeline-date">
                          {dateFormatter.format(event.date)}
                        </span>
                        <span className="auswatch-timeline-label">
                          {HISTORY_EVENT_LABEL[event.eventType]}
                        </span>
                        {event.note && (
                          <span className="auswatch-timeline-note">{event.note}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <Link href={`/report/correction/${camera.id}`} className="auswatch-correction-link">
                Suggest a correction &rarr;
              </Link>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
