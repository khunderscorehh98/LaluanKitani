// Routes between two points that react to live reports, busy Peak Spots and
// event closures. GraphHopper does the routing; this service decides what to
// avoid and adds Laluan Kitani's context to each route.
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { ApiError } from '../lib/errors.js';
import { isConfirmed, routingEffect } from '../lib/reports.js';
import { ALTERNATIVES, CLOSURE_AREA_M, REPORT_AREA_M, buildCustomModel, toSteps, viaRoad } from '../lib/routing.js';
import { listPeakSpots } from './peak-spots.js';

// Reports this close to a route are listed on it ("1 Careful report")
const ON_ROUTE_M = 30;
const GRAPHHOPPER_TIMEOUT_MS = 10_000;

/** Area to look for reports, closures and Peak Spots: around the straight line, with a margin. */
function corridor(from, to) {
  const center = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  // Rough metres between the points; routes rarely stray further than half again
  const dx = (to.lng - from.lng) * 111_320 * Math.cos((center.lat * Math.PI) / 180);
  const dy = (to.lat - from.lat) * 110_540;
  return { center, radius: Math.min(30_000, Math.round(Math.hypot(dx, dy) * 0.75 + 5_000)) };
}

/** Polygons to avoid, grouped by how strongly: { hard, danger, jammed, peak }, plus the Peak Spots found. */
async function avoidAreas(from, to, at) {
  const { center, radius } = corridor(from, to);
  const point = 'ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography';

  const [reports, closures, peakSpots] = await Promise.all([
    query(
      `SELECT label, still_there_count,
              ST_AsGeoJSON(ST_Buffer(geom, $4)::geometry)::json AS area
       FROM reports_live WHERE ST_DWithin(geom, ${point}, $3)`,
      [center.lat, center.lng, radius, REPORT_AREA_M],
    ),
    query(
      `SELECT ST_AsGeoJSON(ST_Buffer(geom, $5)::geometry)::json AS area
       FROM event_closures
       WHERE status = 'published' AND starts_at <= $4 AND ends_at > $4 AND ST_DWithin(geom, ${point}, $3)`,
      [center.lat, center.lng, radius, at, CLOSURE_AREA_M],
    ),
    listPeakSpots({ lat: center.lat, lng: center.lng, radius, at }),
  ]);

  const areas = { hard: closures.rows.map((r) => r.area), danger: [], jammed: [], peak: [] };
  for (const r of reports.rows) {
    const effect = routingEffect(r.label, r.still_there_count);
    if (effect === 'hard_avoid') areas.hard.push(r.area);
    else if (effect === 'strong_soft_avoid') areas.danger.push(r.area);
    else if (effect === 'soft_avoid') areas.jammed.push(r.area);
  }
  areas.peak = peakSpots.peak_spots.filter((s) => s.active).map((s) => s.geometry);
  return { areas, peakSpots: peakSpots.peak_spots };
}

async function graphhopper(from, to, customModel) {
  let response;
  try {
    response = await fetch(`${config.GRAPHHOPPER_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GRAPHHOPPER_TIMEOUT_MS),
      body: JSON.stringify({
        profile: 'car',
        points: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        points_encoded: false,
        instructions: true,
        locale: 'en',
        algorithm: 'alternative_route',
        ...ALTERNATIVES,
        custom_model: customModel,
      }),
    });
  } catch {
    throw new ApiError(503, 'routing_unavailable', 'Routing is not available right now.');
  }
  const body = await response.json().catch(() => ({}));
  if (response.ok) return { paths: body.paths };
  // 400 from GraphHopper: a point is off the road network, or nothing connects them
  if (response.status === 400) return { paths: null, message: body.message };
  throw new ApiError(503, 'routing_unavailable', 'Routing is not available right now.');
}

/** Reports near a route line and Peak Spots it passes through, in driving order. */
async function onRoute(line, distanceM, peakSpots) {
  const geojson = JSON.stringify(line);
  const [reports, spots] = await Promise.all([
    query(
      `WITH route AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g)
       SELECT r.id, r.label, r.road_name, r.still_there_count, r.created_at,
              ST_LineLocatePoint(route.g, r.geom::geometry) AS along
       FROM reports_live r, route
       WHERE ST_DWithin(r.geom, route.g::geography, $2)
       ORDER BY along`,
      [geojson, ON_ROUTE_M],
    ),
    query(
      `WITH route AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g)
       SELECT s.id FROM peak_spots s, route
       WHERE s.active AND ST_Intersects(s.geom, route.g::geography)`,
      [geojson],
    ),
  ]);
  const crossed = new Set(spots.rows.map((r) => r.id));
  return {
    reports: reports.rows.map((r) => ({
      id: r.id,
      label: r.label,
      road_name: r.road_name,
      created_at: r.created_at,
      confirmed: isConfirmed(r.label, r.still_there_count),
      routing_effect: routingEffect(r.label, r.still_there_count),
      distance_from_start_m: Math.round(r.along * distanceM),
    })),
    peak_spots: peakSpots
      .filter((s) => crossed.has(s.id))
      .map(({ id, name, windows, active, busy_until }) => ({ id, name, windows, active, busy_until: busy_until ?? null })),
  };
}

async function plan(from, to, at) {
  const { areas, peakSpots } = await avoidAreas(from, to, at);
  let warnings = [];
  let result = await graphhopper(from, to, buildCustomModel(areas));

  // Start or destination inside a closed area: route anyway without hard avoids,
  // and say so (the app shows the report so the driver can decide)
  if (!result.paths && areas.hard.length) {
    result = await graphhopper(from, to, buildCustomModel({ ...areas, hard: [] }));
    warnings = ['closure_at_endpoint'];
  }
  if (!result.paths) throw new ApiError(422, 'no_route', 'No route was found between these points.');
  return { paths: result.paths, peakSpots, warnings, avoided: areas.hard.length };
}

/**
 * Up to 2 routes, fastest first. With `arriveBy`, routes are planned for the
 * departure that arrives on time and each has a leave_by.
 */
export async function getRoutes({ from, to, at, arriveBy }) {
  let departAt = at ?? new Date();
  let planned = await plan(from, to, arriveBy ?? departAt);
  if (arriveBy) {
    // Plan again for the actual departure, when Peak Spots may differ
    departAt = new Date(arriveBy.getTime() - Math.min(...planned.paths.map((p) => p.time)));
    planned = await plan(from, to, departAt);
  }

  const routes = await Promise.all(
    planned.paths
      .sort((a, b) => a.time - b.time)
      .map(async (path, index) => {
        const durationS = Math.round(path.time / 1000);
        const context = await onRoute(path.points, path.distance, planned.peakSpots);
        const leaveBy = arriveBy && new Date(arriveBy.getTime() - durationS * 1000);
        return {
          index,
          distance_m: Math.round(path.distance),
          duration_s: durationS,
          via: viaRoad(path.instructions),
          ...(leaveBy ? { leave_by: leaveBy, eta: arriveBy } : { eta: new Date(departAt.getTime() + durationS * 1000) }),
          ...context,
          geometry: path.points,
          steps: toSteps(path.instructions, path.points.coordinates),
        };
      }),
  );

  return {
    depart_at: arriveBy ? routes[0].leave_by : departAt,
    ...(arriveBy && { arrive_by: arriveBy }),
    // Hard-avoided areas considered (confirmed Closed/Flooded, event closures)
    avoided_closures: planned.avoided,
    warnings: planned.warnings,
    routes,
  };
}
