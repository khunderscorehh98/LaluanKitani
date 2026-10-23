<p align="center">
  <img src="assets/laluan-kitani/logos/app-icon-light.png" alt="Laluan Kitani app icon" width="96" height="96">
</p>

<h1 align="center">Laluan Kitani</h1>

<p align="center">
  <strong>Tejem? Tani elak.</strong><br>
  <em>Jammed? We dodge it.</em><br>
  Navigasi komuniti Brunei · Brunei's community navigation
</p>

<p align="center"><sub>Developed by <strong>Polaris Digital Solution</strong></sub></p>

---

Laluan Kitani ("our route") is a navigation app built around how Brunei actually works: school-run peaks, Friday prayer closures, flash floods, and the place names Bruneians really use. Drivers' own reports improve it every day.

> **Status: pre-development.** Product design, brand and screen designs are done. No code has been written yet. This README describes what we are building.

## Why another navigation app?

A new app can't beat global apps on crowd size, so Laluan Kitani doesn't try to. It competes on local knowledge, and it has to be useful **from day one with zero users**.

| Local reality | What the app does |
| --- | --- |
| Heavy congestion outside schools, including a midday peak when students move to religious school | **Peak Spots**: admin-drawn busy zones with time windows, school-aware ETAs and a "Leave by" planner |
| Businesses close 12–2pm on Fridays for prayers | Automatic "Closed for Friday prayers · reopens 2pm" label |
| Flash floods on roads in Brunei-Muara, Tutong and Belait | Flooded reports that are hard-avoided by routing once confirmed |
| Addresses use simpang numbers (e.g. Simpang 1366) | Simpang-aware search |
| Places go by local names ("Stadium Negara") | Admin-curated aliases in Malay and English |

## Features

### Phase 1: launch (no ads)

- **Map, search, route preview, turn-by-turn navigation and arrival.**
- **Search** by name, alias, Malay or English, and simpang number. A curated intent table handles everyday needs such as `passport` → Immigration Department and `solat` → mosque or surau.
- **Recurring Peak Spots.** Orange zones with days, school terms and time windows.
- **Driver reports.** Five labels, each sent with one tap while driving. Each label has a fixed routing effect:

  | Label | Malay | Routing effect | Expires |
  | --- | --- | --- | --- |
  | Careful | Berhati-hati | Warning only | 2 h |
  | Jammed | Sesak | Soft avoid, slower ETA | 1 h |
  | Danger | Bahaya | Strong soft avoid | 3 h |
  | Flooded | Banjir | Hard avoid once confirmed | Until voted cleared |
  | Closed | Ditutup | Hard avoid once confirmed | Until voted reopened |

  Closed and Flooded need two or more independent confirmations before they change routing. Passing drivers are asked "Still there?". Descriptions can only be typed when the car is stopped.
- **Label-aware routing.** Hard avoids reroute automatically. Soft avoids offer an alternative only when it saves a meaningful amount of time (about 3 minutes to start with). Reroutes prefer main roads over kampung roads and school zones.
- **"Leave by" planner** and saved places (Home, Work, School) with morning alerts.
- **Place details** with hours, the Friday label, busy times, nearby reports, aliases and "Suggest a fix". Missing hours show "Hours not confirmed", never a guess.
- **Share trip and share live location.** One private link per person. Viewers without the app get a lightweight web viewer.
- **Admin and moderation dashboard** covering places, aliases, intent table, suggestions, Peak Spots, reports, event closures, users and an audit log that can't be edited.
- **Public website** with a landing page, shared-trip viewer and privacy policy.

### Phase 2: revenue and growth

- **Self-managed ads.** Static banners rotate in 5–30 s slots and are sold in packages of 1 week to 3 months. An admin approves every ad. There are **no ads on driving screens** (navigation, map, route preview, reports), and ads hide whenever the phone is moving at driving speed.
- **Merchant portal** for business verification, branches, ad submission, reports, billing and staff accounts.
- **Border tracker.**
- "Notify me when they're 5 min away" for shared trips.

### Phase 3: AI search

- **Chat-style search** built on the Phase 1 intent table and search logs. The AI only interprets the sentence. Places always come from our own database, never invented.

## Privacy by design

- **No account needed** to search, navigate, view reports or open a shared link.
- **Minimal data.** We never store IC numbers, real names, dates of birth, contacts, or continuous location history.
- **Saved places** are encrypted and never shown publicly.
- **Live sharing** is time-limited by default. Each viewer can be approved individually, viewers never see a trail, and a link stops working the moment sharing ends.
- **No third-party ad networks or trackers.** Ad stats are stored as daily totals with no user IDs.

## Planned architecture

```
 Expo app (iOS / Android)          Nuxt site (viewer, landing)     Vue admin dashboard
   MapLibre + PMTiles                       │                              │
          │                                 │                              │
          └──────────────┬──────────────────┴──────────────────────────────┘
                         ▼
             Node.js + Express API  ──── Socket.IO (live sharing, live reports)
                 │              │
                 ▼              ▼
     PostgreSQL + PostGIS    GraphHopper (Docker)
     places, reports,        custom model built per request
     Peak Spots, users       from active reports and Peak Spots
```

| Layer | Choice |
| --- | --- |
| Mobile app | Expo (React Native), development builds |
| Map display | MapLibre React Native |
| Map tiles | Protomaps PMTiles (Brunei extract), served by Nginx |
| Routing | GraphHopper, self-hosted, with custom models for graded avoidance |
| API | Node.js + Express |
| Database | PostgreSQL + PostGIS |
| Real-time | Socket.IO |
| Search | PostgreSQL full-text and fuzzy search |
| Push | Expo Notifications |
| Public web | Nuxt 3 |
| Admin | Vue + Vuetify |
| Auth | JWT; Google / Apple sign-in with email one-time code as fallback |
| Hosting | One UNN Cloud virtual machine in Brunei, so data stays in-country (DigitalOcean as fallback) |

### Place data

Places come from open datasets, and the admin layer corrects them and adds what's missing:

- **Base**: Overture Maps Places, refreshed by re-import and never edited by hand.
- **Local**: places added by admins or from approved driver suggestions.
- **Override**: admin fixes to base places, linked by Overture's stable ID.
- **Alias**: local names in Malay and English.

Admin data is entered from local knowledge and observation, never copied from Google Maps.

## Proof-of-concept milestones

- [ ] Expo + MapLibre showing a Brunei PMTiles map
- [ ] GraphHopper with Brunei OSM data and a custom model that avoids an area
- [ ] PostGIS schema for places, reports and Peak Spots
- [ ] Node API connecting all three

## Brand

- **Name.** Always two words: **Laluan Kitani**.
- **Typeface.** [Manrope](https://fonts.google.com/specimen/Manrope), weights 400–800.
- **Icons.** [Tabler Icons](https://tabler.io/icons), outline style, 24 px grid, 2 px stroke.
- **Palette.** Teal-green `#0F766E`, light mint `#CCFBF1`, charcoal `#1F2937`, off-white `#F9FAFB`, warm sand `#E7D8C3`. In dark mode, use bright teal `#14B8A6` and light teal `#5EEAD4`.
- **Reserved colours.** The report-label colours (yellow, orange, red, blue, black) belong to the map only and are never used for branding.
- **Prohibited.** Never use the Brunei flag or national crest.
- **Voice.** Calm while driving, warm when parked. No exclamation marks while driving.

Design tokens (CSS and JSON), report badges, logos and app icons are in [`assets/laluan-kitani/`](assets/laluan-kitani/). The full brand book is [`Laluan-Kitani-Brand-Guidelines.pdf`](assets/laluan-kitani/Laluan-Kitani-Brand-Guidelines.pdf).

## Open questions

These need to be checked before we build on them:

- How complete Overture and OpenStreetMap coverage is for Brunei places, addresses and simpang numbers
- Whether user and location data must legally stay in Brunei
- How much memory GraphHopper needs for Brunei, and whether UNN's managed database supports PostGIS
- Report expiry times and the reroute threshold (both are starting guesses)
- How ODbL share-alike applies to our merged place data
- How well Malay text-to-speech works for voice guidance

## Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database Licence. Place data from [Overture Maps](https://overturemaps.org/).

## Licence

To be decided.

## Developed by

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/polaris/svg/polaris-combo-mono-dark.svg">
    <img src="assets/polaris/svg/polaris-combo-mono-light.svg" alt="Polaris Digital Solution" width="280">
  </picture>
</p>

Laluan Kitani is designed and built by **Polaris Digital Solution**. Polaris brand assets are in [`assets/polaris/`](assets/polaris/) and are kept separate from the Laluan Kitani brand.

---

<p align="center">Laluan Kitani · Tejem? Tani elak.<br><sub>© 2026 Polaris Digital Solution</sub></p>
