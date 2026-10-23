// Brunei is UTC+8 all year (no daylight saving), so a fixed offset is exact.
const BRUNEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Day of week (0 = Sunday), minutes since midnight and ISO date, in Brunei time. */
export function bruneiClock(at = new Date()) {
  const local = new Date(at.getTime() + BRUNEI_OFFSET_MS);
  return {
    day: local.getUTCDay(),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    date: local.toISOString().slice(0, 10),
  };
}

/** "07:45" or "07:45:00" -> 465 */
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 465 -> "07:45" */
export function toTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}
