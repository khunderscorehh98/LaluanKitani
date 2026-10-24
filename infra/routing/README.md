# Routing (GraphHopper)

Car routing for Brunei, run as the `routing` service in `docker-compose.yml`. Only the API talks to it (port 8989, this machine only). The API adds a custom model to each request so live reports and Peak Spots change the route (hard avoids for confirmed Closed/Flooded, soft avoids for Jammed and busy Peak Spots).

The image is built locally from the **official** GraphHopper release: `graphhopper-web` from Maven Central, checksum-checked, on the official `eclipse-temurin` Java image (see `Dockerfile`). To upgrade, change `GRAPHHOPPER_VERSION` and `GRAPHHOPPER_SHA1` (from the `.jar.sha1` file next to the jar on Maven Central).

## Build `data/brunei.osm.pbf`

Geofabrik has no Brunei-only extract, so cut Brunei out of the Malaysia, Singapore and Brunei one. Uses the same box as the map tiles, which also keeps the Limbang and Miri roads that border trips use.

```bash
# 1. Download (about 250 MB) and check it against Geofabrik's .md5 file
curl -L -o infra/routing/data/malaysia-singapore-brunei-latest.osm.pbf \
  https://download.geofabrik.de/asia/malaysia-singapore-brunei-latest.osm.pbf

# 2. Cut to Brunei (about 10 MB)
docker run --rm -v "$PWD/infra/routing/data:/data" iboates/osmium:1.19.0 \
  extract --bbox 113.95,3.95,115.4,5.1 --strategy complete_ways --overwrite \
  -o /data/brunei.osm.pbf /data/malaysia-singapore-brunei-latest.osm.pbf
```

On Git Bash for Windows, put `MSYS_NO_PATHCONV=1` in front of `docker run`.

## Run

```bash
docker compose up -d --build routing
```

The first start builds the graph into `data/graph-cache/` (a few seconds for Brunei). After replacing `brunei.osm.pbf`, delete `data/graph-cache/` and restart to rebuild it.

Check it: `curl "http://localhost:8989/route?point=4.903,114.923&point=4.946,114.929&profile=car"`

## Licence

Road data © OpenStreetMap contributors, under the ODbL.
