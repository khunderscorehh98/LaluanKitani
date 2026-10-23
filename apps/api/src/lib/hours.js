import { bruneiClock, toMinutes, toTime } from './time.js';

export const FRIDAY = 5;

// By law, businesses close on Fridays from 12:00 to 14:00 for Friday prayers.
export const FRIDAY_PRAYER_START = 12 * 60;
export const FRIDAY_PRAYER_END = 14 * 60;

// The Friday closure applies to businesses only. A place's own
// friday_exempt value, when set by an admin, wins over this list.
export const FRIDAY_EXEMPT_CATEGORIES = new Set(['mosque', 'surau', 'hospital']);

export function isFridayExempt(place) {
  return place.friday_exempt ?? FRIDAY_EXEMPT_CATEGORIES.has(place.category);
}

/**
 * Opening status for the place details page.
 *
 * hours: rows of { day, opens: "HH:MM[:SS]", closes: "HH:MM[:SS]" }
 * Returns one of:
 *   { state: 'hours_not_confirmed' }   no hours entered: never guess
 *   { state: 'closed_friday_prayers', reopens_at }
 *   { state: 'open', closes_at, closing_for_friday_prayers }
 *   { state: 'closed', opens_at }      opens_at is null when it does not reopen today
 */
export function openingStatus(hours, { fridayExempt, at = new Date() }) {
  if (hours.length === 0) return { state: 'hours_not_confirmed' };

  const { day, minutes } = bruneiClock(at);
  const prayerApplies = day === FRIDAY && !fridayExempt;
  const windows = hours
    .filter((row) => row.day === day)
    .map((row) => ({ opens: toMinutes(row.opens), closes: toMinutes(row.closes) }))
    .sort((a, b) => a.opens - b.opens);

  // Next opening after `from`, skipping the prayer break on Fridays.
  const nextOpening = (from) => {
    for (const window of windows) {
      let opens = Math.max(window.opens, from);
      if (prayerApplies && opens >= FRIDAY_PRAYER_START && opens < FRIDAY_PRAYER_END) {
        opens = FRIDAY_PRAYER_END;
      }
      if (opens < window.closes && opens >= from) return opens;
    }
    return null;
  };

  if (prayerApplies && minutes >= FRIDAY_PRAYER_START && minutes < FRIDAY_PRAYER_END) {
    const reopens = nextOpening(FRIDAY_PRAYER_END);
    return { state: 'closed_friday_prayers', reopens_at: reopens === null ? null : toTime(reopens) };
  }

  const current = windows.find((window) => minutes >= window.opens && minutes < window.closes);
  if (current) {
    const closesForPrayers =
      prayerApplies && minutes < FRIDAY_PRAYER_START && current.closes > FRIDAY_PRAYER_START;
    return {
      state: 'open',
      closes_at: toTime(closesForPrayers ? FRIDAY_PRAYER_START : current.closes),
      closing_for_friday_prayers: closesForPrayers,
    };
  }

  const opens = nextOpening(minutes);
  return { state: 'closed', opens_at: opens === null ? null : toTime(opens) };
}

/** Groups hour rows into a full week: [{ day, windows: [{ opens, closes }] }], Sunday first. */
export function weeklyHours(hours) {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    windows: hours
      .filter((row) => row.day === day)
      .sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens))
      .map((row) => ({ opens: row.opens.slice(0, 5), closes: row.closes.slice(0, 5) })),
  }));
}
