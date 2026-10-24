// Follows the driver along the trip's route: progress, the next turn, reports
// ahead, rerouting when they leave the route, and offering a faster route when
// reports make one worth it ("Alternative saves 6 min").
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { apiGet } from '../api/client';
import { inBrunei } from '../location';
import { useTrip } from '../store/trip';
import { locateOnLine, pointAt, prepareLine } from './geo';

// Off the route by more than this for two fixes in a row: plan a new route
const OFF_ROUTE_M = 40;
// Within this of the destination: arrived
const ARRIVED_M = 25;
// Reports this far ahead get a warning banner
const REPORT_AHEAD_M = 1000;
// Check for a faster route this often, and offer it only if it saves this much
const BETTER_ROUTE_EVERY_MS = 120_000;
const BETTER_ROUTE_SAVES_S = 180;
// A new route counts as "the same road" if this share of it follows the current one
const SAME_ROUTE_SHARE = 0.8;
// Development builds outside Brunei (an emulator) drive along the route at this multiple of its speed
const SIMULATION_SPEEDUP = 3;

const routeQuery = ([lng, lat], destination) => ({
  from_lat: lat,
  from_lng: lng,
  to_lat: destination.lat,
  to_lng: destination.lng,
});

/** Where each step starts, in metres from the start of the route. */
function stepStarts(steps) {
  const starts = [];
  let total = 0;
  for (const step of steps) {
    starts.push(total);
    total += step.distance_m;
  }
  return starts;
}

/** Seconds left: each step's time, for the part of it still ahead. */
function remainingSeconds(steps, starts, along) {
  return steps.reduce((sum, step, i) => {
    if (!step.distance_m) return sum;
    const ahead = Math.min(1, Math.max(0, (starts[i] + step.distance_m - Math.max(along, starts[i])) / step.distance_m));
    return sum + step.duration_s * ahead;
  }, 0);
}

/** Does `candidate` mostly follow `line` (the same road, not an alternative)? */
function followsLine(line, candidate) {
  const coords = candidate.geometry.coordinates;
  const samples = Array.from({ length: 12 }, (_, i) => coords[Math.floor((i * (coords.length - 1)) / 11)]);
  const close = samples.filter((p) => locateOnLine(line, p).offset < OFF_ROUTE_M).length;
  return close / samples.length >= SAME_ROUTE_SHARE;
}

/** The phone's position, or a simulated drive along `line` in development builds outside Brunei. */
function usePosition(line) {
  const [position, setPosition] = useState(null);
  const [simulated, setSimulated] = useState(false);
  const simAlong = useRef(0);
  const simLine = useRef(line);
  simLine.current = line;

  useEffect(() => {
    let subscription = null;
    let timer = null;
    let stopped = false;

    const simulate = () => {
      setSimulated(true);
      simAlong.current = 0;
      timer = setInterval(() => {
        const current = simLine.current;
        if (!current) return;
        const speed = current.speed * SIMULATION_SPEEDUP;
        simAlong.current = Math.min(current.length, simAlong.current + speed);
        setPosition({ coords: pointAt(current, simAlong.current).point, speed });
      }, 1000);
    };

    Location.getForegroundPermissionsAsync()
      .then(async ({ granted }) => {
        if (stopped) return;
        const first = granted ? await Location.getLastKnownPositionAsync({ maxAge: 60_000 }).catch(() => null) : null;
        const here = first && [first.coords.longitude, first.coords.latitude];
        if (__DEV__ && (!here || !inBrunei(here))) {
          simulate();
          return;
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
          (fix) => setPosition({ coords: [fix.coords.longitude, fix.coords.latitude], speed: fix.coords.speed }),
        );
        if (stopped) subscription.remove();
      })
      .catch(() => {});

    return () => {
      stopped = true;
      subscription?.remove();
      clearInterval(timer);
    };
  }, []);

  // A new route starts where the driver is: restart the simulated drive on it
  const resetSimulation = () => {
    simAlong.current = 0;
  };

  return { position, simulated, resetSimulation };
}

export function useNavigation() {
  const trip = useTrip((state) => state.trip);
  const replaceRoute = useTrip((state) => state.replaceRoute);
  const route = trip?.route;

  const line = useMemo(() => {
    if (!route) return null;
    const prepared = prepareLine(route.geometry.coordinates);
    return { ...prepared, speed: route.distance_m / Math.max(1, route.duration_s) };
  }, [route]);
  const starts = useMemo(() => (route ? stepStarts(route.steps) : []), [route]);

  const { position, simulated, resetSimulation } = usePosition(line);
  const [progress, setProgress] = useState(null);
  const [rerouting, setRerouting] = useState(false);
  const [offer, setOffer] = useState(null);
  const offRouteFixes = useRef(0);
  const lastAlong = useRef(0);

  const switchTo = (next) => {
    lastAlong.current = 0;
    offRouteFixes.current = 0;
    resetSimulation();
    replaceRoute(next);
  };

  // Each new position: where on the route, and whether they've left it
  useEffect(() => {
    if (!position || !line) return;
    const located = locateOnLine(line, position.coords, lastAlong.current);
    if (!located) return;

    if (located.offset > OFF_ROUTE_M && !simulated) {
      offRouteFixes.current += 1;
      if (offRouteFixes.current >= 2 && !rerouting) {
        setRerouting(true);
        apiGet('/v1/route', routeQuery(position.coords, trip.destination))
          .then((res) => res.routes[0] && switchTo(res.routes[0]))
          .catch(() => {})
          .finally(() => setRerouting(false));
      }
    } else {
      offRouteFixes.current = 0;
    }

    lastAlong.current = located.along;
    setProgress(located);
  }, [position, line]);

  // Every couple of minutes: has a report made another road clearly faster?
  useEffect(() => {
    if (!route || !trip) return undefined;
    const timer = setInterval(async () => {
      if (!position || offer || rerouting) return;
      try {
        const res = await apiGet('/v1/route', routeQuery(position.coords, trip.destination));
        const [fastest] = res.routes;
        if (!fastest || followsLine(line, fastest)) return;
        const current = res.routes.find((r) => followsLine(line, r));
        const currentS = current ? current.duration_s : remainingSeconds(route.steps, starts, lastAlong.current);
        const saves = currentS - fastest.duration_s;
        if (saves >= BETTER_ROUTE_SAVES_S) setOffer({ route: fastest, saves_s: saves, current_s: currentS });
      } catch {
        // Keep the current route; try again next time
      }
    }, BETTER_ROUTE_EVERY_MS);
    return () => clearInterval(timer);
  }, [route, trip, position, offer, rerouting, line, starts]);

  if (!route || !line) return { trip: null };

  const along = progress?.along ?? 0;
  const remainingM = Math.max(0, line.length - along);
  const remainingS = remainingSeconds(route.steps, starts, along);

  // The next manoeuvre ahead, and the road the driver is on now
  let next = route.steps.findIndex((_, i) => i > 0 && starts[i] > along + 5);
  if (next === -1) next = route.steps.length - 1;
  const report = route.reports
    .filter((r) => r.routing_effect !== 'hard_avoid')
    .map((r) => ({ ...r, ahead_m: r.distance_from_start_m - along }))
    .find((r) => r.ahead_m > 0 && r.ahead_m <= REPORT_AHEAD_M);

  return {
    trip,
    route,
    line,
    progress,
    simulated,
    rerouting,
    arrived: progress ? remainingM <= ARRIVED_M : false,
    remaining_m: remainingM,
    remaining_s: remainingS,
    eta: new Date(Date.now() + remainingS * 1000),
    step: route.steps[next],
    step_in_m: Math.max(0, starts[next] - along),
    current_road: route.steps[Math.max(0, next - 1)]?.road ?? null,
    report,
    offer,
    acceptOffer: () => {
      if (offer) switchTo(offer.route);
      setOffer(null);
    },
    dismissOffer: () => setOffer(null),
  };
}
