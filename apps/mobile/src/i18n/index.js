import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { useSettings } from '../store/settings';
import ms from './ms.json';
import en from './en.json';

/** Malay unless the phone's first language is English. */
export function deviceLanguage() {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : 'ms';
}

function currentLanguage() {
  return useSettings.getState().language ?? deviceLanguage();
}

i18n.use(initReactI18next).init({
  resources: { ms: { translation: ms }, en: { translation: en } },
  lng: currentLanguage(),
  fallbackLng: 'ms',
  // Resources are bundled, so finish setup before the first render
  initAsync: false,
  // React already escapes text
  interpolation: { escapeValue: false },
});

// Follow the language chosen in onboarding or Settings
useSettings.subscribe((state, previous) => {
  if (state.language !== previous.language) i18n.changeLanguage(currentLanguage());
});

export default i18n;
