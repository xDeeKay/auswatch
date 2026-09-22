type Point = { lat: number; lng: number };

export type BoundingBox = { south: number; west: number; north: number; east: number };

const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_LAT_DEGREE = (Math.PI * EARTH_RADIUS_METERS) / 180;

export function haversineMeters(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// Computes a lat/lng box enclosing every point, padded by bufferMeters on
// every side. Used to turn a batch of known coordinates (a bulk import) into
// a single bounding-box query instead of one query per point.
export function computeBoundingBox(points: Point[], bufferMeters: number): BoundingBox {
  if (points.length === 0) {
    throw new Error("computeBoundingBox requires at least one point");
  }

  let south = points[0]!.lat;
  let north = points[0]!.lat;
  let west = points[0]!.lng;
  let east = points[0]!.lng;

  for (const point of points) {
    if (point.lat < south) south = point.lat;
    if (point.lat > north) north = point.lat;
    if (point.lng < west) west = point.lng;
    if (point.lng > east) east = point.lng;
  }

  const latBuffer = bufferMeters / METERS_PER_LAT_DEGREE;
  const midLat = (south + north) / 2;
  const metersPerLngDegree = METERS_PER_LAT_DEGREE * Math.cos((midLat * Math.PI) / 180);
  const lngBuffer = bufferMeters / metersPerLngDegree;

  return {
    south: south - latBuffer,
    west: west - lngBuffer,
    north: north + latBuffer,
    east: east + lngBuffer,
  };
}
