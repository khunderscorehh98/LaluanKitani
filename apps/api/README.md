# Laluan Kitani API

Node.js + Express API backed by PostgreSQL + PostGIS. It serves the mobile app, the admin dashboard and the public website.

## Quick start

Requires Node.js 22.9+ and Docker.

```bash
# From the repository root: choose a database password, then start PostGIS (port 5433)
cp .env.example .env        # set POSTGRES_PASSWORD
docker compose up -d

# Then in apps/api
cd apps/api
cp .env.example .env        # set PGPASSWORD to the same value
npm install
npm run db:migrate
npm run db:seed        # demo places, reports and Peak Spots from the screen designs
npm run dev            # http://localhost:4000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with auto-restart on file changes |
| `npm start` | Start without watching |
| `npm run db:migrate` | Apply new files in `db/migrations/`, in order |
| `npm run db:seed` | Load demo fixtures (refuses when `NODE_ENV=production`) |
| `npm run db:reset -- --yes` | Drop everything, re-migrate and re-seed (development only) |
| `npm test` | Rebuild the `laluankitani_test` database and run all tests |

## Endpoints (v1)

All responses are JSON. Errors are always `{ "error": { "code", "message", "details?" } }`.
Coordinates are WGS84 (`lat`, `lng`); distances are in metres. Most endpoints accept `lang=ms|en` (default `ms`).
`at` (ISO date-time) asks "as of this moment", for example to check Friday hours or Peak Spot times.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Database and PostGIS status |
| GET | `/v1/places/search?q=&lat=&lng=&limit=&lang=` | Search by name, alias, simpang number or need (intent table) |
| GET | `/v1/places/:id?lat=&lng=&lang=&at=` | Place details: names, aliases, hours, open status (Friday prayer rule), busy times, nearby reports |
| GET | `/v1/reports?lat=&lng=&radius=` | Live reports with votes, confirmation and routing effect |
| GET | `/v1/peak-spots?lat=&lng=&radius=&at=` | Peak Spot zones (GeoJSON) and whether each is busy now |
| GET | `/v1/closures?lat=&lng=&radius=&at=` | Published event closures that have not ended |
| GET | `/v1/reports/:id?lat=&lng=` | One live report. Signed in, it also says whether it's yours (`mine`) and your vote (`my_vote`) |
| POST | `/v1/reports` 🔒 | Post a report: `{ label, lat, lng, description? }`. Brunei only, 10 per hour per account |
| POST | `/v1/reports/:id/votes` 🔒 | Vote `{ vote: "still_there" \| "gone" }`. One vote per driver, not on your own report. 2 "gone" votes that outnumber "still there" clear it |
| POST | `/v1/auth/email/start` | Send a 6-digit sign-in code: `{ email }` |
| POST | `/v1/auth/email/verify` | Sign in with the code: `{ email, code }`. Returns `{ token, user, new_account, needs_nickname }` |
| POST | `/v1/auth/sign-out` 🔒 | End this device's session |
| GET / PATCH | `/v1/me` 🔒 | The signed-in account; PATCH sets `{ nickname }` |

🔒 needs `Authorization: Bearer <token>` from `/v1/auth/email/verify`.

**Email is not sent yet.** Outside production, `/v1/auth/email/start` logs the code and returns it as `dev_code`, so the app and tests can sign in. Production needs an email provider before launch.

Example:

```bash
curl "http://localhost:4000/v1/places/search?q=simpang%201366%20jalan%20gadong"
```

### Search order

1. **Simpang numbers.** `simpang 1366`, `spg 1366 jln gadong`. Lists every road with that simpang so the app can ask "which one?"
2. **Strong name or alias matches** (typo-tolerant, using `pg_trgm`).
3. **Intent matches.** `renew passport` → Immigration Department, nearest first.
4. **Weaker name matches.**

Searches with no results are logged to `search_misses` with no user id or location.

## How the code is laid out

```
db/migrations/   SQL migrations, applied in filename order
db/seeds/        Demo fixtures (not production data)
src/
  app.js         Express app: middleware and routes
  server.js      Starts the HTTP server, shuts down cleanly
  config.js      Validated environment variables
  db/            Connection pool and migration runner
  lib/           Pure domain rules, unit-tested without a database
    hours.js       Opening status and the Friday 12:00–14:00 prayer closure
    reports.js     Report labels: routing effect, expiry, confirmations
    peak-spots.js  When a Peak Spot is busy
  services/      Database queries for each feature
  routes/        HTTP endpoints and input validation
test/
  unit/          Domain rules
  api/           End-to-end tests against the test database
```

## Data model

- **Places** have layers. `places_base` is imported open data that is never edited. `places_local` holds places added by admins. `place_overrides` holds admin fixes that win over base data. `place_aliases` holds local names. The API reads the `places_effective` view, which combines them and leaves out hidden places.
- **Reports** have one of five labels. The rules for each label are in `src/lib/reports.js`. Closed and Flooded only affect routing after 2 or more independent "still there" votes. The `reports_live` view leaves out expired and removed reports.
- **Peak Spots** are polygons with days, time windows and optional school terms. Term filters only apply once the school calendar for that year is loaded into `school_calendar`.
- **`audit_log`** is append-only. A database trigger rejects any update, delete or truncate.

## Not built yet

- **Authentication:** Google and Apple sign-in, and sending the email code by real email.
- **Write endpoints:** place suggestions and saved-place sync.
- **Reputation and points** for confirmed reports, and a profanity filter on descriptions.
- **Admin endpoints.**
- **Routing through GraphHopper.**
- **Live sharing** over Socket.IO.
- **Push notifications.**
