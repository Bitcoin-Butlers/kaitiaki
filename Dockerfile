# Build from source. We publish no image, and we never pull upstream's:
# ghcr.io/eljojo/rememory carries none of the Bitcoin Butlers work, so a
# bundle made by it still names every guardian in every README.
#
# The build needs Node as well as Go: the pages are TypeScript compiled by
# esbuild, and the maker's create.wasm is Go compiled for js/wasm.

FROM golang:1.25-bookworm AS build

RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs npm \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Dependencies first, so a source edit does not refetch them.
COPY go.mod go.sum ./
RUN go mod download
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV PATH="/src/node_modules/.bin:${PATH}"
RUN make build

FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --create-home --uid 10001 inheritance

COPY --from=build /src/inheritance /usr/local/bin/inheritance

USER inheritance
WORKDIR /data
VOLUME ["/data"]
EXPOSE 8080

# 0.0.0.0 because the default 127.0.0.1 is unreachable from outside the
# container. Put it behind a reverse proxy with TLS.
ENTRYPOINT ["inheritance", "serve", "--host", "0.0.0.0", "--port", "8080", "--data", "/data"]
