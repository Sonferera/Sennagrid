# Update: Hardening CI dan Build Deployment

- **Date:** 2026-11-27
- **Author / Role:** Security Audit follow-up (Owner A)
- **Scope:** `docs` (`.github/workflows/ci.yml`, `vercel.json`)
- **Related Commits / PR:** menindaklanjuti audit `docs/security-audit/2026-11-27/`

## Summary

Tiga catatan hardening dari audit keamanan 2026-11-27 diterapkan pada jalur delivery repository. Audit tidak menemukan finding confirmed, sehingga perubahan ini bersifat defense-in-depth: memperketat wewenang token CI, menghilangkan ketergantungan pada tag action yang bisa dipindah publisher, dan memastikan build deployment memakai resolusi lockfile yang sama dengan yang diaudit.

## Changes

- `.github/workflows/ci.yml`: menambahkan blok `permissions: contents: read` di level workflow sehingga token `GITHUB_TOKEN` tidak mewarisi default repository yang lebih luas.
- `.github/workflows/ci.yml`: `actions/checkout@v4` -> `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` (v4.4.0) dan `actions/setup-node@v4` -> `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0), dengan komentar versi agar SHA dapat ditelusuri saat upgrade.
- `vercel.json`: `installCommand` diubah dari `npm install` menjadi `npm ci`, sehingga build Vercel memasang resolusi yang tercatat di `package-lock.json` alih-alih boleh memperbarui lockfile.
- `docs/CHANGELOG.md`: entri `[Unreleased]` pada bagian `Changed`; catatan ini pada `docs/updates/`.

Tidak ada perubahan pada `packages/` maupun `apps/`; tipe publik, rumus, dan kontrak worker tidak berubah sehingga `docs/BLUEPRINT.md` dan `docs/HANDOFF.md` tidak perlu disinkronkan.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: PASS (72/72 test — engine 43, web 29)
- `npm run build`: PASS (typecheck engine + web, lalu bundle Vite)
- YAML workflow tetap valid dan `vercel.json` tetap JSON valid; kedua berkas diverifikasi ulang setelah edit.
- Batasan: workflow CI yang sudah di-pinning tidak dapat dijalankan lokal sebelum merge; verifikasi akhir dilakukan oleh GitHub Actions pada push/pull request ke `main`.
