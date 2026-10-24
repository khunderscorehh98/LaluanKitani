import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

/**
 * The signed-in account, if any. Most of the app works without one; posting
 * and confirming reports need it (product rule). The token stays encrypted on the phone.
 */
export const useSession = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: 'session',
      version: 1,
      storage: secureStorage,
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
);

/** Signed in and has picked a nickname, so can post reports. */
export const isReady = ({ token, user }) => Boolean(token && user?.nickname);
