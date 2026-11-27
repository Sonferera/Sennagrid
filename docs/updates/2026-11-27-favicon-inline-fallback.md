# Update: Inline Data-URI Favicon Fallback in index.html

- **Date:** 2026-11-27
- **Author / Role:** Irfan (`Sonferera`) / Owner B UI
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** `fix/inline-favicon-dev-cache`

## Summary

Added an inline `data:image/svg+xml` `<link rel="icon">` entry in `apps/web/index.html` alongside `<link rel="alternate icon" type="image/svg+xml" href="/favicon.svg?v=2" />` so the 2x2 SennaGrid browser tab icon renders immediately even on already-running Vite dev servers whose initial startup predated `apps/web/public/favicon.svg`.

## Changes

- Updated `apps/web/index.html` to serve the encoded 2x2 `#0f766e` / `#fbf9f5` / `#5eead4` SVG icon inline via `data:image/svg+xml` with `/favicon.svg?v=2` as the alternate icon link.
- Updated `docs/CHANGELOG.md` under `[Unreleased]`.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: 76/76 PASS (`43` `@sennagrid/engine` + `33` `@sennagrid/web`)
- `npm run build`: PASS
- Verified `http://localhost:5173/` returns the updated `index.html` with inline SVG icon markup and decodes cleanly in browser.
