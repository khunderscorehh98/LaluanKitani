import { useColorScheme } from 'react-native';
import { colors } from './tokens';

/** Colours for the current light/dark mode. */
export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme] };
}
