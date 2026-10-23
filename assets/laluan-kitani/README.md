# Laluan Kitani — implementation assets

Source: Laluan Kitani design system and brand guidelines, Version 1, October 2026.

## Contents

| Folder | Files | Use |
| --- | --- | --- |
| `report-badges/` | `report-careful.svg`, `report-jammed.svg`, `report-danger.svg`, `report-flooded.svg`, `report-closed.svg`, `report-peak-spot.svg` | Map warning badges, 64 × 64, white ring included. Map only; never in buttons, marketing or the logo. |
| `tokens/` | `laluan-kitani-tokens.css` | CSS variables (light + `[data-theme="dark"]`) and type-scale classes for the website and admin. |
| `tokens/` | `laluan-kitani-tokens.json` | Same tokens as JSON, for the mobile app theme (e.g. React Native / Expo). |
| *(this folder)* | `Laluan-Kitani-Brand-Guidelines.pdf` | The full brand book. |
| `logos/` | `app-icon-light.png`, `app-icon-dark.png` | 1024 × 1024 app icon masters, transparent corners. |
| `logos/` | `symbol-teal.png` (light backgrounds), `symbol-bright-teal.png` (dark), `symbol-offwhite.png` (on teal only), `symbol-charcoal.png` (single colour on mint/sand) | The K alone, 697 × 596, transparent. |
| `logos/` | `logo-light-original.jpg`, `logo-dark-original.jpg` | Supplied masters, untouched. Reference only. |
| `app-icons/ios/` | `icon-1024.png` … `icon-40.png` | Opaque square icons (iOS adds its own rounded mask). 1024 is the App Store icon. |
| `app-icons/android/` | `ic_launcher-mdpi-48.png` … `ic_launcher-xxxhdpi-192.png`, `ic_launcher-play-store-512.png` | Legacy launcher sizes + Play Store icon. |
| `app-icons/web/` | `favicon.ico`, `favicon-16/32.png`, `apple-touch-icon.png`, `icon-192/512.png` (+ `-dark`) | Website favicons and PWA manifest icons. |

Resized icons were made from `app-icon-light.png` (dark set from `app-icon-dark.png`)
with Lanczos resampling. iOS and apple-touch icons are flattened onto teal-green
`#0F766E` because Apple requires opaque icons. For Expo, point `icon` at
`app-icons/ios/icon-1024.png`; Android adaptive icons need a separate
foreground/background pair, which is not included.

## About the logo masters

The masters are 1024 px raster files, not vector. Per the brand book, their
colours sit close to but not exactly on the palette, and the light and dark
masters differ in their lane dashes. Commission an SVG master before print or
large-format use.

## Rules to follow when building

- Name is always two words: **Laluan Kitani**. In the lockup, “Laluan” is charcoal (`#1F2937`), “Kitani” is teal-green (`#0F766E`); on dark, off-white and light-teal (`#5EEAD4`). Font: Manrope Bold.
- The lockup is symbol + live text, not an image. Minimum 120 px wide; symbol minimum 24 px tall; clear space ¼ of the symbol height on every side.
- Dark mode buttons: bright-teal (`#14B8A6`) with **charcoal** labels. White on bright-teal is only 2.4:1.
- Careful badge uses a charcoal icon (white on yellow is 1.9:1).
- Never use the Brunei flag or national crest.
- Font: Manrope 400–800, Google Fonts, SIL Open Font Licence — https://fonts.google.com/specimen/Manrope
- Icons: Tabler Icons outline, 24 px grid, 2 px stroke, MIT licence — https://tabler.io/icons
- Map credit: “© OpenStreetMap contributors” (or “© OpenStreetMap”), shown on the map — https://osmfoundation.org/wiki/Attribution
