import Constants from 'expo-constants';

/**
 * Server addresses. Override either one in apps/mobile/.env.local with
 * EXPO_PUBLIC_API_URL or EXPO_PUBLIC_TILES_URL. In development both default to
 * the computer running Metro, so a phone on the same Wi-Fi needs no setup.
 */
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${devHost}:4000`;

export const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL || `http://${devHost}:8080/tiles/brunei.pmtiles`;
