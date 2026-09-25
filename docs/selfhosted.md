# Hosting Bitcoin Inheritance

There are two ways to host Bitcoin Inheritance for your guardians: **static pages** (simplest) and a **self-hosted server** (full-featured).

## Static pages

The lightest option. Generate a folder with `recover.html` and `MANIFEST.age`, then upload it anywhere that serves files — GitHub Pages, Netlify, an S3 bucket, any web server.

```bash
inheritance seal --pages
# or after sealing:
inheritance bundle --pages
```

This creates `output/pages/` in your project. The `recover.html` page fetches `MANIFEST.age` from the same directory automatically. Guardians visit the URL, add their shares, and recover. No server-side code runs — it's just static files.

Works well when:
- You want to give guardians a URL instead of (or alongside) a ZIP file
- You don't need the ability to create bundles from the browser
- You don't want to run a server

Limitations:
- Guardians still need their shares (from their bundles or README.txt files)
- No admin interface — you manage files directly
- No bundle creation in the browser (use [Create Bundles](https://www.bitcoinbutlers.com/tools/inheritance/maker.html), or the command line)

## Self-hosted server

Run Bitcoin Inheritance as a web app on your own server — create bundles, store encrypted archives, and recover, all from a browser.

### Docker

**There is no published image, and you should not pull one.** Upstream's
`ghcr.io/eljojo/rememory` is a different build: bundles made by it still name
every guardian in every README, with their contact details. Build from this
repository instead.

```bash
docker build -t inheritance:local .
docker run -d \
  --name inheritance \
  -p 127.0.0.1:8080:8080 \
  -v inheritance-data:/data \
  inheritance:local
```

The build needs no toolchain on your machine. It installs Go and Node inside
the image, compiles the TypeScript and the maker's WebAssembly, and ships only
the binary in the final layer.

Visit `http://localhost:8080` to set up. The first page asks you to choose an
admin password for deleting bundles.

The port binds to `127.0.0.1` on purpose. Put a reverse proxy with TLS in front
of it before you expose it to a network. See **Reverse proxy** below.

**Docker Compose:**

```yaml
services:
  inheritance:
    build: .
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - inheritance-data:/data
    restart: unless-stopped
    # environment:
    #   INHERITANCE_MAX_MANIFEST_SIZE: 200MB

volumes:
  inheritance-data:
```

The final image carries the binary and a CA bundle, nothing else. Data lives in `/data` — mount a volume there to persist across restarts.

### Without Docker

Build the binary, then run it. There are no published binaries either, so
this is the only way to get one:

```bash
npm install
make build
./inheritance serve
```

`make build` needs Go and Node. It compiles the TypeScript, builds the maker's
WebAssembly, then the binary.

### Options

| Flag | Env var | Default | Description |
|------|--------|---------|-------------|
| `--port, -p` | `INHERITANCE_PORT` | `8080` | Port to listen on |
| `--host` | `INHERITANCE_HOST` | `127.0.0.1` | Host to bind to |
| `--data, -d` | `INHERITANCE_DATA` | `./inheritance-data` | Data directory for bundles and config |
| `--max-manifest-size` | `INHERITANCE_MAX_MANIFEST_SIZE` | `50MB` | Maximum MANIFEST.age size (e.g. `50MB`, `1GB`) |

Flags take precedence over environment variables.

## Deployment

### Reverse proxy

Put the server behind a reverse proxy with TLS.

**Caddy:**
```
inheritance.example.com {
    reverse_proxy localhost:8080
}
```

**nginx:**
```nginx
server {
    listen 443 ssl;
    server_name inheritance.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }
}
```

### Authentication

The admin password only protects bundle deletion. For access control, use an auth proxy:

- [Authelia](https://www.authelia.com/)
- [Cloudflare Access](https://www.cloudflare.com/products/zero-trust/access/)
- [Pocket ID](https://github.com/pocket-id/pocket-id)
- [OAuth2 Proxy](https://oauth2-proxy.github.io/oauth2-proxy/)

## Security

- The server stores only encrypted archives (MANIFEST.age). Without enough shares, the archive is useless.
- Shares are never sent to the server. They stay in each friend's bundle.
- The admin password uses age's scrypt-based passphrase encryption. Choose a strong one.
- Put the server behind HTTPS and authentication appropriate for your threat model.

Guardians still get self-contained offline bundles. The server is a convenience — if it goes away, they can recover without it.

## Data directory

The data directory contains:

```
inheritance-data/
  admin.age               # Admin password (age-encrypted)
  bundles/
    <uuid>/
      meta.json           # Non-secret metadata
      MANIFEST.age        # Encrypted archive
```

Back up this directory to preserve your encrypted archives. The admin.age file can be recreated by setting a new password (you'd lose the ability to delete existing bundles with the old password, but the bundles themselves are unaffected).
