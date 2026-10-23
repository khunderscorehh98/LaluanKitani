# Map tiles

The app's base map is a single [PMTiles](https://docs.protomaps.com/pmtiles/) file covering Brunei, cut from the [Protomaps](https://protomaps.com) daily build of OpenStreetMap. The file is about 15 MB, covers zoom 0–15, and is git-ignored. Build it locally with the steps below.

## Build `data/brunei.pmtiles`

1. Download the `pmtiles` CLI for your platform from https://github.com/protomaps/go-pmtiles/releases and unzip it into `tools/pmtiles/` at the repository root (git-ignored).
2. Pick a recent build date from https://maps.protomaps.com/builds/ (format `YYYYMMDD`).
3. Extract the Brunei area. This downloads only the needed tiles (~16 MB), not the 139 GB world file.

```bash
./tools/pmtiles/pmtiles extract https://build.protomaps.com/20261023.pmtiles \
  infra/tiles/data/brunei.pmtiles --bbox=113.95,3.95,115.40,5.10
```

4. Serve it: `docker compose up -d tiles`, then check http://localhost:8080/tiles/brunei.pmtiles.

## Licence

Map data © OpenStreetMap contributors, under the ODbL. The app shows this credit on the map.
