import i18n from 'i18next';

/** 250 -> '250 m', 9420 -> '9.4 km'. */
export function formatDistance(metres) {
  if (metres === null || metres === undefined) return null;
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

/** Display name for a place category code, e.g. 'sports_venue' -> 'Sports venue'. */
export function categoryLabel(code) {
  if (!code) return null;
  const fallback = code.charAt(0).toUpperCase() + code.slice(1).replaceAll('_', ' ');
  return i18n.t(`categories.${code}`, { defaultValue: fallback });
}

/** 'Simpang 1366, Jalan Gadong', or just 'Simpang 1366' when the road is unknown. */
export function simpangLabel(number, road) {
  return road ? i18n.t('search.simpangOnRoad', { number, road }) : `Simpang ${number}`;
}

/**
 * Second line under a place name: its name in the other language, its
 * simpang and its category, e.g. 'Kedai Makan Sinar Kiulap · Simpang 1366, Jalan Gadong · Restaurant'.
 */
export function placeSubtitle(place) {
  const other = i18n.language === 'en' ? place.name_ms : place.name_en;
  return [
    other && other !== place.name ? other : null,
    place.simpang ? simpangLabel(place.simpang, place.road) : null,
    categoryLabel(place.category),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** '07:00' or '07:00:00' -> '7:00', as written on the designs. */
export function clock(hhmm) {
  return hhmm.slice(0, 5).replace(/^0(\d)/, '$1');
}

/** Minutes since midnight for 'HH:MM'. */
export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** '12 min ago', '3 h ago', or the date when older than a day. */
export function timeAgo(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return i18n.t('time.justNow');
  if (minutes < 60) return i18n.t('time.minutesAgo', { count: minutes });
  if (minutes < 24 * 60) return i18n.t('time.hoursAgo', { count: Math.floor(minutes / 60) });
  return formatDate(iso);
}

/** 'Today 11:58', 'Yesterday 7:12', 'Tue 16:40' within a week, else the date. */
export function formatWhen(iso, now = new Date()) {
  const date = new Date(iso);
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (daysAgo === 0) return i18n.t('time.todayAt', { time });
  if (daysAgo === 1) return i18n.t('time.yesterdayAt', { time });
  if (daysAgo < 7) return `${i18n.t('days.short', { returnObjects: true })[date.getDay()]} ${time}`;
  return formatDate(iso);
}

/** A time of day: '7:38 am' in English, '07:38' in Malay. */
export function formatClock(date) {
  const d = new Date(date);
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (i18n.language !== 'en') return `${String(d.getHours()).padStart(2, '0')}:${minutes}`;
  const hour = d.getHours() % 12 || 12;
  return `${hour}:${minutes} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

/** 40 -> '40 min', 135 -> '2 h 15 min'. */
export function formatDuration(minutes) {
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return i18n.t('time.minutes', { count: m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${i18n.t('time.hours', { count: h })} ${i18n.t('time.minutes', { count: rest })}` : i18n.t('time.hours', { count: h });
}

/** '12 Oct 2026' (or the Malay month name). */
export function formatDate(iso) {
  const locale = i18n.language === 'ms' ? 'ms-BN' : 'en-GB';
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
