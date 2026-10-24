// Laluan Kitani design tokens, from assets/laluan-kitani/tokens/laluan-kitani-tokens.json.
// Report colours are RESERVED for map warnings: never use them for buttons or branding.

export const palette = {
  tealGreen: '#0F766E',
  lightMint: '#CCFBF1',
  charcoal: '#1F2937',
  offWhite: '#F9FAFB',
  warmSand: '#E7D8C3',
  brightTeal: '#14B8A6',
  lightTeal: '#5EEAD4',
};

export const colors = {
  light: {
    surface: palette.offWhite,
    surfaceRaised: '#FFFFFF',
    ink: palette.charcoal,
    inkMuted: '#4B5563',
    hairline: '#E5E7EB',
    primary: palette.tealGreen,
    onPrimary: palette.offWhite,
    tealText: palette.tealGreen,
    highlight: palette.lightMint,
    friendly: palette.warmSand,
    // Pill behind the active tab icon
    selected: palette.lightMint,
    // Form errors. Deliberately not the reserved Danger report red (#DC2626)
    error: '#B91C1C',
  },
  dark: {
    surface: palette.charcoal,
    surfaceRaised: '#111827',
    ink: palette.offWhite,
    inkMuted: '#D1D5DB',
    hairline: '#374151',
    primary: palette.brightTeal,
    // White on bright teal is only 2.4:1, so labels are charcoal in dark mode
    onPrimary: palette.charcoal,
    tealText: palette.lightTeal,
    highlight: palette.lightMint,
    friendly: palette.warmSand,
    // Deep teal so the light-teal icon on top stays readable
    selected: '#134E4A',
    error: '#FCA5A5',
  },
};

export const reportColors = {
  careful: '#EAB308',
  jammed: '#EA580C',
  danger: '#DC2626',
  flooded: '#2563EB',
  closed: '#0A0A0A',
  peakZone: { light: '#EA580C33', dark: '#EA580C40' },
};

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};

export const type = {
  h1: { fontFamily: fonts.extraBold, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
};

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };
