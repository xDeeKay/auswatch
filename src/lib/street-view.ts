// Google's public Maps URL for a Street View at a coordinate. It needs no API
// key; where there is no coverage Google falls back to the map.
export function getStreetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
