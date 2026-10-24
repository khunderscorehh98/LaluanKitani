# GraphHopper routing engine, built from the official release only:
# the graphhopper-web jar from Maven Central (checksum-checked) on the
# official Eclipse Temurin Java image. No third-party images.
FROM eclipse-temurin:21-jre-noble

ARG GRAPHHOPPER_VERSION=11.1
ARG GRAPHHOPPER_SHA1=6e6c173c2b46cb0a3c1df124b2144d557931597e

WORKDIR /graphhopper
# Maven Central publishes SHA-1 checksums (Docker's ADD --checksum needs SHA-256)
ADD https://repo1.maven.org/maven2/com/graphhopper/graphhopper-web/${GRAPHHOPPER_VERSION}/graphhopper-web-${GRAPHHOPPER_VERSION}.jar \
    graphhopper-web.jar
RUN echo "${GRAPHHOPPER_SHA1}  graphhopper-web.jar" | sha1sum -c - && chmod 644 graphhopper-web.jar

# Run as a normal user; the graph is written to the mounted /data
RUN useradd --system --uid 10001 graphhopper && mkdir -p /data && chown graphhopper /data
USER graphhopper

ENV JAVA_OPTS="-Xmx1g -Xms512m"
EXPOSE 8989

# Builds the graph on first start (from datareader.file in the config), then serves
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar graphhopper-web.jar server /config/config.yml"]
