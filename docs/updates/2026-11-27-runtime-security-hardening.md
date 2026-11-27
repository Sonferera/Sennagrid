# Update: Runtime & Deployment Defense-in-Depth Security Hardening

- **Date:** 2026-11-27
- **Author / Role:** Irfan (`Sonferera`) / Full-Stack Engine & UI
- **Scope:** `apps/web` | `docs` (`vercel.json`)
- **Related Commits / PR:** `chore/security-defense-in-depth`

## Summary

Added optional defense-in-depth hardening following the 2026-11-27 security audit and the addition of Global City Search: baseline HTTP security headers on Vercel static responses, a 100-character cap on Open-Meteo Geocoding queries, and a store-layer `Number.isFinite` guard inside `clampBudget`.

## Changes

- `vercel.json`: added baseline HTTP security headers for `/(.*)`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`.
- `apps/web/src/services/geocoding.ts` & `apps/web/src/components/layout/ControlBar.tsx`: exported `MAX_CITY_QUERY_LENGTH = 100`, capped geocoding query strings to 100 characters in `buildOpenMeteoGeocodingUrl` and `searchCities`, and added `maxLength={MAX_CITY_QUERY_LENGTH}` to `#sg-city-search`.
- `apps/web/src/store/useSimulationStore.ts`: guarded `clampBudget` with `!Number.isFinite(ratio)` returning `DEFAULT_SIMULATION_PARAMS.budgetRatio` (`0.2`), complementing the engine's own finite-number guard.
- `apps/web/src/services/__tests__/services.test.ts` & `apps/web/src/store/__tests__/useSimulationStore.test.ts`: added regression checks for 100-character geocoding query truncation and non-finite `setBudgetRatio` (`NaN`, `Infinity`) fallback.
- `docs/CHANGELOG.md`: documented the defense-in-depth hardening under `[Unreleased]`.

## Verification

- `npm run check:docs` and `node scripts/check-docs.mjs --base origin/main`: PASS
- `npm run test`: PASS (`80/80` tests across `@sennagrid/engine` `43/43` and `@sennagrid/web` `37/37`, including 100-char geocoding length cap and `NaN`/`Infinity` `setBudgetRatio` checks)
- `npm run build`: PASS (`tsc --noEmit` on engine & web + Vite bundle in `8.31s`)
- `vercel.json` JSON validation: PASS (`4` baseline HTTP security headers parsed cleanly)
