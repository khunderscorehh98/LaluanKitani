import { createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// SecureStore keeps data encrypted on the phone. Its synchronous getItem lets
// stores load before the first render, so nothing flickers on launch.
export const secureStorage = createJSONStorage(() => ({
  getItem: (key) => SecureStore.getItem(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}));
