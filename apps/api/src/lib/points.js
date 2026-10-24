// Points and levels for drivers who report. Starting values, to tune.
// Confirmed reports earn the most: each "still there" from another driver is
// worth more than the vote that gives it.
export const POINTS = {
  report: 10,
  confirmationReceived: 5,
  voteCast: 2,
};

// Level 3 shows the Trusted reporter badge on the driver's reports and profile
export const LEVELS = [
  { level: 1, key: 'new_driver', from: 0 },
  { level: 2, key: 'helper', from: 250 },
  { level: 3, key: 'trusted_reporter', from: 1000 },
  { level: 4, key: 'community_guide', from: 2000 },
];

export function pointsFor({ reports = 0, confirmationsReceived = 0, votesCast = 0 }) {
  return reports * POINTS.report + confirmationsReceived * POINTS.confirmationReceived + votesCast * POINTS.voteCast;
}

/**
 * Where `points` sits: current level and the points it starts at (for progress
 * bars), the next level (null at the top) and how far to it.
 */
export function levelFor(points) {
  const current = [...LEVELS].reverse().find((l) => points >= l.from);
  const next = LEVELS.find((l) => l.from > points) ?? null;
  return {
    level: current.level,
    key: current.key,
    from: current.from,
    of: LEVELS.length,
    next: next && { key: next.key, at: next.from, points_to_go: next.from - points },
  };
}
