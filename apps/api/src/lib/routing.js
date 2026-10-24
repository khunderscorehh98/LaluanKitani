// How reports, Peak Spots and closures change a route, as a GraphHopper custom
// model sent with each request. Starting values from the product brief, to tune.
//
//   hard_avoid        (confirmed Closed/Flooded, event closures) never routed through
//   strong_soft_avoid (Danger)  much less preferred
//   soft_avoid        (Jammed)  slower, so the ETA is honest and faster roads win
//   busy Peak Spot              slower inside the zone while its window is on
//   kampung roads               mildly less preferred than main roads
export const AVOID = {
  dangerPriority: 0.3,
  jammedSpeed: 0.4,
  peakSpotSpeed: 0.5,
  residentialPriority: 0.8,
  servicePriority: 0.6,
};

// Buffers drawn around point reports and closed road lines, in metres
export const REPORT_AREA_M = 40;
export const CLOSURE_AREA_M = 15;

// Ask GraphHopper for up to 2 routes (the route preview shows two options).
// A second route must share at most 80% of the first: short trips often have
// no real alternative, and a near-copy would mislead, so they get one route.
export const ALTERNATIVES = {
  'alternative_route.max_paths': 2,
  'alternative_route.max_weight_factor': 2,
  'alternative_route.max_share_factor': 0.8,
  'alternative_route.min_plateau_factor': 0.2,
};

/**
 * GraphHopper custom model. Each group is a list of GeoJSON polygons:
 * { hard, danger, jammed, peak } (any may be empty).
 */
export function buildCustomModel({ hard = [], danger = [], jammed = [], peak = [] } = {}) {
  const features = [];
  const condition = (prefix, polygons) => {
    if (!polygons.length) return null;
    const ids = polygons.map((geometry, i) => {
      const id = `${prefix}${i}`;
      features.push({ type: 'Feature', id, geometry, properties: {} });
      return `in_${id}`;
    });
    return ids.join(' || ');
  };

  const priority = [
    { if: 'road_class == RESIDENTIAL', multiply_by: String(AVOID.residentialPriority) },
    { if: 'road_class == SERVICE', multiply_by: String(AVOID.servicePriority) },
  ];
  const speed = [];

  const hardIf = condition('hard', hard);
  if (hardIf) priority.push({ if: hardIf, multiply_by: '0' });
  const dangerIf = condition('danger', danger);
  if (dangerIf) priority.push({ if: dangerIf, multiply_by: String(AVOID.dangerPriority) });
  const jammedIf = condition('jam', jammed);
  if (jammedIf) speed.push({ if: jammedIf, multiply_by: String(AVOID.jammedSpeed) });
  const peakIf = condition('peak', peak);
  if (peakIf) speed.push({ if: peakIf, multiply_by: String(AVOID.peakSpotSpeed) });

  return {
    priority,
    ...(speed.length && { speed }),
    ...(features.length && { areas: { type: 'FeatureCollection', features } }),
  };
}

// GraphHopper instruction signs -> our step types (the app writes the words)
const SIGNS = {
  '-98': 'u_turn',
  '-8': 'u_turn',
  '-7': 'keep_left',
  '-6': 'leave_roundabout',
  '-3': 'sharp_left',
  '-2': 'left',
  '-1': 'slight_left',
  0: 'continue',
  1: 'slight_right',
  2: 'right',
  3: 'sharp_right',
  4: 'arrive',
  5: 'waypoint',
  6: 'roundabout',
  7: 'keep_right',
  8: 'u_turn',
};

export function stepType(sign) {
  return SIGNS[sign] ?? 'continue';
}

/** Turn-by-turn steps, with where each one starts. coordinates: [[lng, lat], ...]. */
export function toSteps(instructions, coordinates) {
  return instructions.map((i) => ({
    type: stepType(i.sign),
    road: i.street_name || null,
    ...(i.exit_number && { exit: i.exit_number }),
    distance_m: Math.round(i.distance),
    duration_s: Math.round(i.time / 1000),
    location: coordinates[i.interval[0]],
  }));
}

/** The road a route spends longest on, for "via Jalan Gadong". */
export function viaRoad(instructions) {
  const byRoad = {};
  for (const i of instructions) {
    if (i.street_name) byRoad[i.street_name] = (byRoad[i.street_name] ?? 0) + i.distance;
  }
  const [best] = Object.entries(byRoad).sort((a, b) => b[1] - a[1]);
  return best?.[0] ?? null;
}
