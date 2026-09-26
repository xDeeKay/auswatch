export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

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

// CARTO's place layer only promotes a handful of the world's highest-ranked
// cities (rank <= 2, which for Australia is only Sydney and Melbourne) down
// to the dataset's own minzoom floor. The next tier down (rank <= 4) does
// cover the rest of the state/territory capitals, but it's a global rank
// shared with places CARTO considers equally significant regardless of
// whether they're a capital - Alice Springs, Newcastle and Townsville all
// carry rank 4 too, as does Port Moresby just across the Torres Strait, close
// enough to sit inside this app's Australia-only view. Rank isn't a reliable
// proxy for "capital city" here, so the low-zoom capital labels are drawn by
// a dedicated layer (see CAPITAL_CITY_LAYER in VectorBasemap.tsx) filtered by
// an explicit name whitelist instead of overriding CARTO's own rank tiers.
export const CAPITAL_CITY_NAMES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Hobart", "Darwin", "Canberra"];

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
  boundary_state: { "line-color": "rgba(233, 228, 216, 0.2)" },
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
