import Constants from 'expo-constants';

/**
 * Server addresses. Override either one with EXPO_PUBLIC_API_URL or
 * EXPO_PUBLIC_TILES_URL in apps/mobile/.env (see .env.example). In development
 * both default to the computer running Metro, so a phone on the same Wi-Fi
 * needs no setup. Empty values count as unset.
 */
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${devHost}:4000`;

export const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL || `http://${devHost}:8080/tiles/brunei.pmtiles`;
