import { create } from 'zustand';

/** A short message for the Map tab to show once, e.g. after sending a report. Not saved. */
export const useFlash = create((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
