import { query } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { isFridayExempt, openingStatus, weeklyHours } from '../lib/hours.js';
import { escapeLike, normalizeQuery, parseSimpang } from '../lib/search-text.js';
import { listLiveReports } from './reports.js';
import { listPeakSpots } from './peak-spots.js';

// Minimum pg_trgm word similarity for a name or alias to count as a match.
// 0.5 keeps one-letter typos ("stadim" = 0.71) and drops look-alikes ("stesen" = 0.43).
const NAME_MATCH_THRESHOLD = 0.5;
// Name matches at least this strong are shown before intent matches.
const STRONG_NAME_MATCH = 0.75;

const NEARBY_REPORTS_RADIUS_M = 500;
const BUSY_TIMES_RADIUS_M = 1000;

// $1 = lat, $2 = lng (both may be NULL)
const PLACE_COLUMNS = `
  p.id, p.source, p.name_ms, p.name_en, p.base_name, p.category, p.district, p.simpang, p.road,
  ST_Y(p.geom::geometry) AS lat,
  ST_X(p.geom::geometry) AS lng,
  CASE WHEN $1::float8 IS NULL THEN NULL
       ELSE ST_Distance(p.geom, ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography)
  END AS distance_m`;

export function displayName(row, lang) {
  return lang === 'en'
    ? row.name_en ?? row.name_ms ?? row.base_name
    : row.name_ms ?? row.name_en ?? row.base_name;
}

function toSummary(row, lang, match) {
  return {
    id: row.id,
    name: displayName(row, lang),
    name_ms: row.name_ms ?? null,
    name_en: row.name_en ?? row.base_name ?? null,
    category: row.category,
    district: row.district,
    simpang: row.simpang,
    road: row.road,
    location: { lat: row.lat, lng: row.lng },
    distance_m: row.distance_m === null ? null : Math.round(row.distance_m),
    match,
  };
}

async function searchBySimpang({ number, road }, lat, lng, limit) {
  const roadPattern = road ? `%${escapeLike(road)}%` : null;
  const [places, roads] = await Promise.all([
    query(
      `SELECT ${PLACE_COLUMNS}
       FROM places_effective p
       WHERE p.simpang = $3 AND ($4::text IS NULL OR lower(p.road) LIKE $4)
       ORDER BY distance_m NULLS LAST, p.search_name
       LIMIT $5`,
      [lat ?? null, lng ?? null, number, roadPattern, limit],
    ),
    // Every road that has this simpang number, so the app can ask "which one?"
    query(
      `SELECT road, count(*)::int AS place_count
       FROM places_effective
       WHERE simpang = $1 AND road IS NOT NULL AND ($2::text IS NULL OR lower(road) LIKE $2)
       GROUP BY road ORDER BY road`,
      [number, roadPattern],
    ),
  ]);
  return { places: places.rows, roads: roads.rows };
}

async function matchIntent(text) {
  // A keyword matches when it appears as whole words in the query,
  // e.g. "renew passport" matches "passport". Longest keyword wins.
  const { rows } = await query(
    `SELECT i.need, i.categories, best.keyword
     FROM intents i
     CROSS JOIN LATERAL (
       SELECT k AS keyword FROM unnest(i.keywords) AS k
       WHERE position(' ' || lower(k) || ' ' IN ' ' || $1 || ' ') > 0
       ORDER BY length(k) DESC LIMIT 1
     ) best
     ORDER BY length(best.keyword) DESC
     LIMIT 1`,
    [text],
  );
  return rows[0] ?? null;
}

async function searchByCategories(categories, lat, lng, limit) {
  const { rows } = await query(
    `SELECT ${PLACE_COLUMNS}
     FROM places_effective p
     WHERE p.category = ANY ($3::text[])
     ORDER BY distance_m NULLS LAST, p.search_name
     LIMIT $4`,
    [lat ?? null, lng ?? null, categories, limit],
  );
  return rows;
}

async function searchByName(text, lat, lng, limit) {
  const { rows } = await query(
    `SELECT ${PLACE_COLUMNS},
       word_similarity($3, p.search_name) AS name_score,
       a.alias AS matched_alias,
       COALESCE(a.score, 0) AS alias_score
     FROM places_effective p
     LEFT JOIN LATERAL (
       SELECT pa.alias, word_similarity($3, lower(pa.alias)) AS score
       FROM place_aliases pa
       WHERE pa.place_id = p.id AND pa.status = 'active'
       ORDER BY score DESC
       LIMIT 1
     ) a ON true
     WHERE GREATEST(word_similarity($3, p.search_name), COALESCE(a.score, 0)) >= $4
     ORDER BY GREATEST(word_similarity($3, p.search_name), COALESCE(a.score, 0)) DESC,
              distance_m NULLS LAST
     LIMIT $5`,
    [lat ?? null, lng ?? null, text, NAME_MATCH_THRESHOLD, limit],
  );
  return rows.map((row) => ({ ...row, score: Math.max(row.name_score, row.alias_score) }));
}

function nameMatch(row) {
  return row.alias_score > row.name_score
    ? { type: 'alias', alias: row.matched_alias }
    : { type: 'name' };
}

async function logSearchMiss(text) {
  await query('INSERT INTO search_misses (query) VALUES ($1)', [text]);
}

/**
 * Phase 1 search: simpang numbers, then curated intents and names/aliases.
 * Places always come from our own database.
 */
export async function searchPlaces({ q, lat, lng, limit, lang }) {
  const text = normalizeQuery(q);
  const simpang = parseSimpang(text);

  if (simpang) {
    const { places, roads } = await searchBySimpang(simpang, lat, lng, limit);
    if (places.length === 0) await logSearchMiss(text);
    return {
      query: text,
      intent: null,
      simpang: { number: simpang.number, road: simpang.road, roads },
      results: places.map((row) => toSummary(row, lang, { type: 'simpang' })),
    };
  }

  const [intent, nameRows] = await Promise.all([
    matchIntent(text),
    searchByName(text, lat, lng, limit),
  ]);
  const intentRows = intent ? await searchByCategories(intent.categories, lat, lng, limit) : [];

  const strong = nameRows.filter((row) => row.score >= STRONG_NAME_MATCH);
  const weak = nameRows.filter((row) => row.score < STRONG_NAME_MATCH);
  const ordered = [
    ...strong.map((row) => toSummary(row, lang, nameMatch(row))),
    ...intentRows.map((row) => toSummary(row, lang, { type: 'intent', need: intent.need })),
    ...weak.map((row) => toSummary(row, lang, nameMatch(row))),
  ];

  const seen = new Set();
  const results = ordered.filter((place) => !seen.has(place.id) && seen.add(place.id)).slice(0, limit);

  if (results.length === 0) await logSearchMiss(text);

  return {
    query: text,
    intent: intent ? { need: intent.need, categories: intent.categories } : null,
    simpang: null,
    results,
  };
}

/** Everything the place details page shows. */
export async function getPlace(id, { lang, lat, lng, at }) {
  const { rows } = await query(
    `SELECT ${PLACE_COLUMNS}, p.address, p.phone, p.website, p.friday_exempt,
            p.last_verified_at
     FROM places_effective p
     WHERE p.id = $3`,
    [lat ?? null, lng ?? null, id],
  );
  const place = rows[0];
  if (!place) throw notFound('Place');

  const [aliases, hours, nearbyReports, peakSpots] = await Promise.all([
    query(
      `SELECT alias, language FROM place_aliases
       WHERE place_id = $1 AND status = 'active' ORDER BY alias`,
      [id],
    ),
    query(
      `SELECT day, opens::text AS opens, closes::text AS closes
       FROM place_hours WHERE place_id = $1 ORDER BY day, opens`,
      [id],
    ),
    listLiveReports({ lat: place.lat, lng: place.lng, radius: NEARBY_REPORTS_RADIUS_M }),
    listPeakSpots({ lat: place.lat, lng: place.lng, radius: BUSY_TIMES_RADIUS_M, at }),
  ]);

  const fridayExempt = isFridayExempt(place);
  const { match, ...summary } = toSummary(place, lang);

  return {
    ...summary,
    address: place.address,
    phone: place.phone,
    website: place.website,
    also_known_as: aliases.rows,
    status: openingStatus(hours.rows, { fridayExempt, at }),
    friday_prayer_closure: !fridayExempt,
    hours: hours.rows.length ? weeklyHours(hours.rows) : null,
    // Peak Spot windows on the way here, for the "Busy times" chart
    busy_times: peakSpots.peak_spots.map(({ geometry, school_terms, busy_until, ...spot }) => spot),
    nearby_reports: nearbyReports,
    last_verified_at: place.last_verified_at,
  };
}
