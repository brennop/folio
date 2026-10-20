# Folio

Investment tracker focused on Brazilian assets. Data is stored in the browser (IndexedDB/localStorage); the server only proxies Gemini, Yahoo Finance and BCB.

## Getting Started

```bash
bun install
bun dev            # http://localhost:3000
```

Set `GEMINI_API_KEY` in `.env` to enable parsing assets from text.

## Single binary

```bash
bun run build      # → dist/folio
GEMINI_API_KEY=... ./dist/folio
```

The binary embeds the frontend, CSS and fonts. Keep port 3000 (`PORT` env var): browser data is tied to the origin.
