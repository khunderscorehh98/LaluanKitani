/** Lower-case, single-spaced, trimmed. */
export function normalizeQuery(text) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

// "simpang 1366", "spg 1366", "simpang 1366 jalan gadong", "jln gadong spg 1366"
const SIMPANG_PATTERN = /\b(?:simpang|spg)\.?\s*(\d{1,5})\b/;

/**
 * Detects a simpang (side-road number) query.
 * Returns { number, road } where road is the remaining text (e.g. "jalan gadong"),
 * or null if the query has no simpang number.
 */
export function parseSimpang(normalized) {
  const match = normalized.match(SIMPANG_PATTERN);
  if (!match) return null;

  const road = normalized
    .replace(match[0], ' ')
    .replace(/\bjln\b\.?/g, 'jalan')
    .replace(/[,]/g, ' ')
    .replace(/\b(of|di|off)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { number: match[1], road: road || null };
}

/** Escapes % and _ so user text can be used inside a LIKE pattern. */
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
