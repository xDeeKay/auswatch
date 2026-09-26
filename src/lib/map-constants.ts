export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

// MapLibre zoom (one below Leaflet's) at which suburb labels start. CARTO's
// tiles carry no suburb features below tile zoom 11, so going lower shows
// nothing; its own style starts them at 12.
export const SUBURB_LABEL_MIN_ZOOM = 11;

// Leaflet's default (60) is tuned for a 100px wheel notch, but on Windows it
// also divides each notch by 2 x devicePixelRatio, so a scaled display needs
// dozens of notches to cross the full zoom range. Lower is faster.
export const WHEEL_PX_PER_ZOOM_LEVEL = 25;

// [south-west, north-east]. Mainland + Tasmania, no external territories -
// the camera dataset doesn't extend to them and including Norfolk/Cocos/etc.
// would just pull the fitted view away from where every marker actually is.
export const AUSTRALIA_BOUNDS: [[number, number], [number, number]] = [
  [-44.5, 111.5],
  [-9.0, 154.5],
];

// A looser box the map won't pan past, so panning stays in-region without
// clamping so tight that the fitted view feels boxed in.
export const AUSTRALIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-48, 105],
  [-6, 162],
];

// CARTO's tiles carry the state and territory capitals only from tile zoom 3
// (below that, just Sydney), which is above the zoom a phone-width view of the
// whole country sits at, and its rank-based place tiers also pull in
// non-capitals such as Alice Springs and Port Moresby. So the capital labels
// are drawn from this list instead of the tiles (see CAPITAL_CITY_LAYER in
// VectorBasemap.tsx). Ordered by label priority when they collide at low zoom.
export const CAPITAL_CITIES: readonly { name: string; lat: number; lng: number }[] = [
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { name: "Brisbane", lat: -27.4698, lng: 153.0251 },
  { name: "Perth", lat: -31.9505, lng: 115.8605 },
  { name: "Adelaide", lat: -34.9285, lng: 138.6007 },
  { name: "Darwin", lat: -12.4634, lng: 130.8456 },
  { name: "Hobart", lat: -42.8821, lng: 147.3272 },
  { name: "Canberra", lat: -35.2809, lng: 149.13 },
];

// The largest cities below the capitals, drawn the same way and for the same
// reason: CARTO's tiles only carry most of them from tile zoom 4 or 5, and its
// ranks are not population (Griffith outranks Wollongong). Tier 1 is the
// biggest and best spread, shown first; tier 2 fills in as the map zooms.
// Within a tier, earlier entries win when labels collide.
export const REGIONAL_CITIES: readonly { name: string; lat: number; lng: number; tier: 1 | 2 }[] = [
  { name: "Gold Coast", lat: -28.0167, lng: 153.4, tier: 1 },
  { name: "Newcastle", lat: -32.9283, lng: 151.7817, tier: 1 },
  { name: "Townsville", lat: -19.259, lng: 146.8169, tier: 1 },
  { name: "Cairns", lat: -16.9186, lng: 145.7781, tier: 1 },
  { name: "Wollongong", lat: -34.4278, lng: 150.8931, tier: 1 },
  { name: "Geelong", lat: -38.1499, lng: 144.3617, tier: 1 },
  { name: "Sunshine Coast", lat: -26.65, lng: 153.0667, tier: 1 },
  { name: "Toowoomba", lat: -27.5598, lng: 151.9507, tier: 1 },
  { name: "Launceston", lat: -41.4332, lng: 147.1441, tier: 1 },
  { name: "Alice Springs", lat: -23.698, lng: 133.8807, tier: 1 },
  { name: "Mackay", lat: -21.1411, lng: 149.1861, tier: 1 },
  { name: "Rockhampton", lat: -23.3781, lng: 150.5136, tier: 1 },
  { name: "Ballarat", lat: -37.5622, lng: 143.8503, tier: 1 },
  { name: "Bendigo", lat: -36.757, lng: 144.2794, tier: 1 },
  { name: "Bunbury", lat: -33.3271, lng: 115.6414, tier: 1 },
  { name: "Geraldton", lat: -28.7774, lng: 114.6149, tier: 2 },
  { name: "Kalgoorlie", lat: -30.7489, lng: 121.4658, tier: 2 },
  { name: "Albany", lat: -35.0269, lng: 117.8837, tier: 2 },
  { name: "Broome", lat: -17.9614, lng: 122.2359, tier: 2 },
  { name: "Karratha", lat: -20.7361, lng: 116.8463, tier: 2 },
  { name: "Port Hedland", lat: -20.3106, lng: 118.6011, tier: 2 },
  { name: "Katherine", lat: -14.4652, lng: 132.2635, tier: 2 },
  { name: "Mount Isa", lat: -20.7256, lng: 139.4927, tier: 2 },
  { name: "Bundaberg", lat: -24.8661, lng: 152.3489, tier: 2 },
  { name: "Gladstone", lat: -23.8427, lng: 151.2555, tier: 2 },
  { name: "Hervey Bay", lat: -25.2882, lng: 152.7683, tier: 2 },
  { name: "Coffs Harbour", lat: -30.2963, lng: 153.1135, tier: 2 },
  { name: "Port Macquarie", lat: -31.4333, lng: 152.9, tier: 2 },
  { name: "Tamworth", lat: -31.0927, lng: 150.932, tier: 2 },
  { name: "Lismore", lat: -28.8136, lng: 153.277, tier: 2 },
  { name: "Orange", lat: -33.2839, lng: 149.1012, tier: 2 },
  { name: "Dubbo", lat: -32.2569, lng: 148.6011, tier: 2 },
  { name: "Wagga Wagga", lat: -35.1082, lng: 147.3598, tier: 2 },
  { name: "Albury", lat: -36.0737, lng: 146.9135, tier: 2 },
  { name: "Broken Hill", lat: -31.953, lng: 141.4537, tier: 2 },
  { name: "Mildura", lat: -34.1855, lng: 142.1625, tier: 2 },
  { name: "Shepparton", lat: -36.3805, lng: 145.399, tier: 2 },
  { name: "Warrnambool", lat: -38.3818, lng: 142.488, tier: 2 },
  { name: "Mount Gambier", lat: -37.8284, lng: 140.7807, tier: 2 },
  { name: "Whyalla", lat: -33.0333, lng: 137.5833, tier: 2 },
  { name: "Burnie", lat: -41.05, lng: 145.9, tier: 2 },
];

export const CARTO_DARK_MATTER_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
export const CARTO_RASTER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const CARTO_LIGHT_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const CARTO_LIGHT_RASTER_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const CARTO_ATTRIBUTION = "&copy; OpenStreetMap &copy; CARTO";

// Repaints CARTO's dark-matter vector style onto AusWatch's own palette
// (surface/foreground/amber) instead of its stock neutral-grey scheme, the same
// per-layer override technique used in the SkyBro project this was adapted
// from - one flat color per layer rather than a zoom-stop translation, since
// matching the source raster's own stop breakpoints wouldn't carry over.
//
// The `background` layer is a full-canvas fill with no source or filter, so
// it IS the land tone almost everywhere - `landcover`/`park_*`/`landuse` only
// paint the specific parcels tagged forest, grass, reserve, or residential in
// OSM, which is a small, irregularly-shaped fraction of the country. Giving
// those layers their own distinct color (as an earlier pass here did) made
// every tagged parcel read as a patch of a different shade floating in
// untagged land - so instead they're flattened to the same tone as
// `background` itself, and only water, roads and boundaries carry contrast.
const LAND_COLOR = "#232b34";
export const WATER_COLOR = "#121921";

export const DARK_MATTER_OVERRIDES: Record<string, Record<string, string | number>> = {
  background: { "background-color": LAND_COLOR },
  landcover: { "fill-color": LAND_COLOR, "fill-opacity": 1 },
  park_national_park: { "fill-color": LAND_COLOR, "fill-opacity": 1 },
  park_nature_reserve: { "fill-color": LAND_COLOR, "fill-opacity": 1 },
  landuse: { "fill-color": LAND_COLOR, "fill-opacity": 1 },
  landuse_residential: { "fill-color": LAND_COLOR, "fill-opacity": 1 },
  // water_shadow shades deeper/shelf water a touch darker than water in the
  // stock style - flattened to the same tone so the Australia mask (also
  // WATER_COLOR, see australia-mask.ts) has no seam against real ocean.
  water: { "fill-color": WATER_COLOR, "fill-opacity": 1 },
  water_shadow: { "fill-color": WATER_COLOR, "fill-opacity": 1 },
  waterway: { "line-color": "#334353" },
  boundary_county: { "line-color": "#333f4a" },
  boundary_state: { "line-color": "rgba(233, 228, 216, 0.3)" },
  boundary_country_outline: { "line-color": "rgba(217, 164, 65, 0.4)" },
  boundary_country_inner: { "line-color": "rgba(233, 228, 216, 0.25)" },
  "aeroway-runway": { "line-color": "#3c4854" },
  "aeroway-taxiway": { "line-color": "#3c4854" },
  tunnel_service_case: { "line-color": "#141a20" },
  tunnel_minor_case: { "line-color": "#141a20" },
  tunnel_sec_case: { "line-color": "#141a20" },
  tunnel_pri_case: { "line-color": "#141a20" },
  tunnel_trunk_case: { "line-color": "#141a20" },
  tunnel_mot_case: { "line-color": "#141a20" },
  tunnel_path: { "line-color": "#0a0d11" },
  tunnel_service_fill: { "line-color": "#2c353f" },
  tunnel_minor_fill: { "line-color": "#2c353f" },
  tunnel_sec_fill: { "line-color": "#343f4a" },
  tunnel_pri_fill: { "line-color": "#3d4954" },
  tunnel_trunk_fill: { "line-color": "#3d4954" },
  tunnel_mot_fill: { "line-color": "#47535f" },
  tunnel_rail: { "line-color": "#333f4a" },
  tunnel_rail_dash: { "line-color": "#0a0d11" },
  road_service_case: { "line-color": "#141a20" },
  road_minor_case: { "line-color": "#141a20" },
  road_pri_case_ramp: { "line-color": "#141a20" },
  road_trunk_case_ramp: { "line-color": "#141a20" },
  road_mot_case_ramp: { "line-color": "#141a20" },
  road_sec_case_noramp: { "line-color": "#141a20" },
  road_pri_case_noramp: { "line-color": "#141a20" },
  road_trunk_case_noramp: { "line-color": "#141a20" },
  road_mot_case_noramp: { "line-color": "#141a20" },
  road_path: { "line-color": "#333f4a" },
  road_service_fill: { "line-color": "#2c353f" },
  road_minor_fill: { "line-color": "#343f4a" },
  road_pri_fill_ramp: { "line-color": "#3d4954" },
  road_trunk_fill_ramp: { "line-color": "#47535f" },
  road_mot_fill_ramp: { "line-color": "#505d6a" },
  road_sec_fill_noramp: { "line-color": "#3d4954" },
  road_pri_fill_noramp: { "line-color": "#3d4954" },
  road_trunk_fill_noramp: { "line-color": "#47535f" },
  road_mot_fill_noramp: { "line-color": "#505d6a" },
  rail: { "line-color": "#374250" },
  rail_dash: { "line-color": "#0a0d11" },
  bridge_service_case: { "line-color": "#141a20" },
  bridge_minor_case: { "line-color": "#141a20" },
  bridge_sec_case: { "line-color": "#141a20" },
  bridge_pri_case: { "line-color": "#141a20" },
  bridge_trunk_case: { "line-color": "#141a20" },
  bridge_mot_case: { "line-color": "#141a20" },
  bridge_path: { "line-color": "#333f4a" },
  bridge_service_fill: { "line-color": "#2c353f" },
  bridge_minor_fill: { "line-color": "#343f4a" },
  bridge_sec_fill: { "line-color": "#3d4954" },
  bridge_pri_fill: { "line-color": "#3d4954" },
  bridge_trunk_fill: { "line-color": "#47535f" },
  bridge_mot_fill: { "line-color": "#505d6a" },
  building: { "fill-color": "#28313b" },
  "building-top": { "fill-color": "#28313b", "fill-outline-color": "#333f4a" },
  waterway_label: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#0a0d11" },
  watername_ocean: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "rgba(10, 13, 17, 0.85)" },
  watername_sea: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "rgba(10, 13, 17, 0.85)" },
  watername_lake: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#0a0d11" },
  watername_lake_line: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#0a0d11" },
  place_hamlet: { "text-color": "rgba(233, 228, 216, 0.55)", "icon-color": "rgba(233, 228, 216, 0.55)", "text-halo-color": "#0a0d11" },
  place_suburbs: { "text-color": "rgba(233, 228, 216, 0.55)", "icon-color": "rgba(233, 228, 216, 0.55)", "text-halo-color": "#0a0d11" },
  place_villages: { "text-color": "rgba(233, 228, 216, 0.55)", "icon-color": "rgba(233, 228, 216, 0.55)", "text-halo-color": "#0a0d11" },
  place_town: { "text-color": "rgba(233, 228, 216, 0.6)", "icon-color": "rgba(233, 228, 216, 0.6)", "text-halo-color": "#0a0d11" },
  place_city_r5: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_city_r6: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_city_dot_r7: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_city_dot_r4: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_city_dot_r2: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_city_dot_z7: { "text-color": "rgba(233, 228, 216, 0.7)", "icon-color": "rgba(233, 228, 216, 0.7)", "text-halo-color": "#0a0d11" },
  place_capital_dot_z7: { "text-color": "rgba(233, 228, 216, 0.75)", "icon-color": "rgba(217, 164, 65, 0.8)", "text-halo-color": "#0a0d11" },
  place_country_1: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "#0a0d11" },
  place_country_2: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "#0a0d11" },
  place_state: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#0a0d11" },
  place_continent: { "text-color": "rgba(233, 228, 216, 0.3)", "text-halo-color": "#0a0d11" },
  poi_stadium: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "#0a0d11" },
  poi_park: { "text-color": "rgba(233, 228, 216, 0.4)", "text-halo-color": "#0a0d11" },
  roadname_minor: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#10151a" },
  roadname_sec: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#10151a" },
  roadname_pri: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#10151a" },
  roadname_major: { "text-color": "rgba(233, 228, 216, 0.45)", "text-halo-color": "#10151a" },
};
