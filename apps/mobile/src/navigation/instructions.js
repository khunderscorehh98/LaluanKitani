// Turn instructions in the app's language. The API sends step types (GraphHopper
// has no Malay); the words come from src/i18n.
import i18n from 'i18next';
import { formatDistance } from '../format';

/** 'Turn right onto Jalan Gadong', 'At the roundabout, take exit 2 onto…', 'Arrive'. */
export function instructionText(step) {
  if (!step) return '';
  const key = step.road ? `nav.step.${step.type}_onto` : `nav.step.${step.type}`;
  return i18n.t(key, {
    road: step.road,
    exit: step.exit,
    defaultValue: i18n.t(step.road ? 'nav.step.continue_onto' : 'nav.step.continue', { road: step.road }),
  });
}

/** Distance to a manoeuvre, in steps a driver can read at a glance: 300 m, 1.2 km. */
export function distanceToTurn(metres) {
  if (metres < 1000) return formatDistance(metres < 100 ? Math.max(10, Math.round(metres / 10) * 10) : Math.round(metres / 50) * 50);
  return formatDistance(metres);
}
