import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

export const SHORTCUTS = ['home', 'work', 'school'];
const MAX_FAVOURITES = 50;

/**
 * A saved place: either a place from our database (placeId set) or a point
 * the driver pinned on the map, like a house that isn't in the database.
 *   { key, placeId, name, detail, location: { lat, lng } }
 */
export function savedFromPlace(place, detail) {
  return { key: `place:${place.id}`, placeId: place.id, name: place.name, detail, location: place.location };
}

export function savedFromPin(location, name) {
  return { key: `pin:${location.lat.toFixed(6)},${location.lng.toFixed(6)}`, placeId: null, name, detail: null, location };
}

/**
 * Home / Work / School and favourites. Kept encrypted on this phone only and
 * never sent to the server (privacy rule), until sign-in sync exists.
 */
export const useSavedPlaces = create(
  persist(
    (set) => ({
      shortcuts: { home: null, work: null, school: null },
      favourites: [],
      setShortcut: (slot, saved) => set(({ shortcuts }) => ({ shortcuts: { ...shortcuts, [slot]: saved } })),
      removeShortcut: (slot) => set(({ shortcuts }) => ({ shortcuts: { ...shortcuts, [slot]: null } })),
      addFavourite: (saved) =>
        set(({ favourites }) => ({
          favourites: [saved, ...favourites.filter((f) => f.key !== saved.key)].slice(0, MAX_FAVOURITES),
        })),
      removeFavourite: (key) => set(({ favourites }) => ({ favourites: favourites.filter((f) => f.key !== key) })),
      // Account deletion removes saved places fully (privacy rule)
      clearAll: () => set({ shortcuts: { home: null, work: null, school: null }, favourites: [] }),
    }),
    {
      name: 'saved-places',
      version: 1,
      storage: secureStorage,
      partialize: ({ shortcuts, favourites }) => ({ shortcuts, favourites }),
    },
  ),
);

/** Saves a search result or pinned point into a shortcut slot or the favourites. */
export function saveTo(slot, saved) {
  const store = useSavedPlaces.getState();
  if (SHORTCUTS.includes(slot)) store.setShortcut(slot, saved);
  else store.addFavourite(saved);
}
