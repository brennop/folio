# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun dev        # Dev server with HMR at localhost:3000
bun run build  # Compile a single executable to dist/folio
bun start      # Run the server in production mode (no HMR)
```

Run the binary with `FIRE_DATA=... ./dist/folio` (or a `.env` in the cwd). Assets are read-only, parsed from the `$FIRE_DATA` TSV by `src/api/assets.js` (format shared with `~/projects/fire`). Keep port 3000: stock targets live in IndexedDB, scoped to the origin.

## Architecture

A Bun full-stack app: `Bun.serve` with an HTML import, no framework.

**Key conventions:**
- `src/server.js` - server entry; the `routes` map wires pages and API endpoints
- `src/index.html` + `src/frontend.jsx` - HTML shell and React root; `frontend.jsx` maps paths to page components
- `src/router.jsx` - tiny client router (`Link`, `useRoute`, `navigate`). New pages need an entry in both `frontend.jsx` and `server.js`
- Pages in `src/pages/` (`Home.jsx`, `Stocks.jsx`)
- API handlers in `src/api/` - `async (Request) => Response`, registered per HTTP method in `server.js`
- Global styles in `src/styles/globals.css` - Tailwind v4 (via `bun-plugin-tailwind`, configured in `bunfig.toml` for dev and `build.js` for the binary); Geist Mono from `@fontsource`, use the `font-mono` class
- `build.js` - `Bun.build` with `compile`, bundles frontend, CSS, fonts and API into one executable

**Path aliasing:** Use `@/` prefix for imports from `src/` (e.g., `import { Link } from '@/router'`)

**Stack:** Bun, React 19, Tailwind CSS 4

## Project

Investment tracker with a focus on brazillian assets.

## Planning

On plan mode, always skip verification steps.
