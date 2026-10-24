import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

const MAX_RECENT = 6;

/** Searches the driver acted on. Kept on this phone only; cleared from Settings. */
export const useRecentSearches = create(
  persist(
    (set) => ({
      items: [],
      add: (text) =>
        set(({ items }) => {
          const query = text.trim();
          if (!query) return {};
          const others = items.filter((item) => item.toLowerCase() !== query.toLowerCase());
          return { items: [query, ...others].slice(0, MAX_RECENT) };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'recent-searches',
      version: 1,
      storage: secureStorage,
      partialize: ({ items }) => ({ items }),
    },
  ),
);
