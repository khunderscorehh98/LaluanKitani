import { create } from 'zustand';

/**
 * The trip being driven: the route chosen in the preview and where it goes.
 * In memory only; a trip doesn't survive closing the app.
 */
export const useTrip = create((set) => ({
  trip: null,
  start: ({ route, destination, avoidedClosures }) =>
    set({ trip: { route, destination, avoidedClosures, startedAt: Date.now() } }),
  replaceRoute: (route) => set(({ trip }) => (trip ? { trip: { ...trip, route } } : {})),
  end: () => set({ trip: null }),
}));
