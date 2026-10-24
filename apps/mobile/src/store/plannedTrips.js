import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

/**
 * Trips queued with "Remind me": where to, arrive by, leave by, and the
 * phone's reminder id. Kept on this phone only.
 *   { id, destination: { lat, lng, name }, arriveBy, leaveBy, remindAt, reminderId }
 */
export const usePlannedTrips = create(
  persist(
    (set) => ({
      trips: [],
      add: (trip) => set(({ trips }) => ({ trips: [...trips, trip].sort((a, b) => a.leaveBy.localeCompare(b.leaveBy)) })),
      remove: (id) => set(({ trips }) => ({ trips: trips.filter((trip) => trip.id !== id) })),
      // Trips whose arrival time has passed are no longer upcoming
      prune: () => set(({ trips }) => ({ trips: trips.filter((trip) => new Date(trip.arriveBy) > new Date()) })),
    }),
    { name: 'planned-trips', version: 1, storage: secureStorage, partialize: ({ trips }) => ({ trips }) },
  ),
);

/** Same destination (within ~10 m) and arrival time: the trip is already queued. */
export function findPlanned(trips, destination, arriveBy) {
  return trips.find(
    (trip) =>
      trip.arriveBy === arriveBy.toISOString() &&
      Math.abs(trip.destination.lat - destination.lat) < 1e-4 &&
      Math.abs(trip.destination.lng - destination.lng) < 1e-4,
  );
}
