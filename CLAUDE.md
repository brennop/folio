# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
yarn dev      # Start development server at localhost:3000
yarn build    # Production build
yarn start    # Start production server
```

## Architecture

This is a Next.js 16 project using the **Pages Router** pattern (not App Router).

**Key conventions:**
- Pages live in `src/pages/` - files become routes automatically
- API routes in `src/pages/api/` - backend endpoints
- Global styles in `src/styles/globals.css` - Tailwind v4 with CSS variables for dark mode
- Static assets in `public/`

**Path aliasing:** Use `@/` prefix for imports from `src/` (e.g., `import '@/styles/globals.css'`)

**Stack:** Next.js 16, React 19, Tailwind CSS 4, PostCSS

## Project

Investment tracker with a focus on brazillian assets.
