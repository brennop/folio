# Folio

Investment tracker focused on Brazilian assets. Assets are read from the TSV file at `$FIRE_DATA` (same format as `~/projects/fire`); the server also proxies Yahoo Finance and BCB. Stock targets are stored in the browser (IndexedDB).

## Getting Started

```bash
bun install
bun dev            # http://localhost:3000
```

Set `FIRE_DATA` (e.g. in `.env`) to the path of the TSV file.

## Single binary

```bash
bun run build      # → dist/folio
FIRE_DATA=... ./dist/folio
```

The binary embeds the frontend, CSS and fonts. Keep port 3000 (`PORT` env var): stock targets are tied to the origin.
