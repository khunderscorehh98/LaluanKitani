import { bruneiClock, toMinutes } from './time.js';

/**
 * Whether a Recurring Peak Spot is busy at `at`.
 *
 * spot: { days: number[], school_terms: string[], windows: [{ starts, ends }] }
 * termsToday: school terms covering today's date (empty = school holidays),
 *             or null when no school calendar is loaded for this year, in which
 *             case term filters are skipped rather than guessed.
 *
 * Returns { active, busy_until } where busy_until is "HH:MM" or null.
 */
export function peakSpotActivity(spot, { at = new Date(), termsToday = null } = {}) {
  const inactive = { active: false, busy_until: null };
  const { day, minutes } = bruneiClock(at);

  if (!spot.days.includes(day)) return inactive;

  if (spot.school_terms.length > 0 && termsToday !== null) {
    const today = termsToday.length > 0 ? termsToday : ['school_holidays'];
    if (!today.some((term) => spot.school_terms.includes(term))) return inactive;
  }

  const window = spot.windows.find(
    (w) => minutes >= toMinutes(w.starts) && minutes < toMinutes(w.ends),
  );
  return window ? { active: true, busy_until: window.ends.slice(0, 5) } : inactive;
}
