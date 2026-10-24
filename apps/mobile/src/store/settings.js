import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureStorage } from './secureStorage';

/** App preferences kept on this phone. */
export const useSettings = create(
  persist(
    (set) => ({
      // 'ms' | 'en', or null to follow the phone's language
      language: null,
      onboarded: false,
      setLanguage: (language) => set({ language }),
      finishOnboarding: () => set({ onboarded: true }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: secureStorage,
      partialize: ({ language, onboarded }) => ({ language, onboarded }),
    },
  ),
);
