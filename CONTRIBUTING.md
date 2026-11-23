# Contributing to SennaGrid

Terima kasih telah berkontribusi pada pengembangan **SennaGrid**. Repositori ini menggunakan **npm workspaces monorepo** dengan aturan ketat agar kolaborasi paralel tetap rapi dan setiap perubahan selalu terdokumentasi.

---

## 1. Setup Awal & Git Hook

Setelah clone repo, jalankan:

```bash
npm install
git config core.hooksPath .githooks
```

Perintah `git config core.hooksPath .githooks` mengaktifkan pre-commit hook yang otomatis menjalankan `npm run check:docs -- --staged` sebelum setiap commit.

---

## 2. Pembagian Wilayah Kerja (Anti-Konflik)

- **Owner A (`packages/engine/`, `apps/web/src/data/`, `apps/web/src/services/`, `apps/web/src/workers/`):** Model matematika, ODE solver, optimizer, policy gates, preset GeoJSON, layanan cuaca/ekspor, dan Web Worker.
- **Owner B (`apps/web/src/store/`, `apps/web/src/components/`, `apps/web/src/App.tsx`):** State store, Split-Screen MapLibre, grafik Recharts, tabel Dispatch Schedule, Methodology panel, dan onboarding tour.

---

## 3. Aturan Wajib Dokumentasi Setiap Update

Setiap commit/PR yang menyentuh file di bawah `packages/` atau `apps/` **wajib**:
1. Memperbarui [docs/CHANGELOG.md](./docs/CHANGELOG.md) di bawah `[Unreleased]`.
2. Untuk fitur baru, perubahan algoritma, atau refactor arsitektur: menambahkan file baru di `docs/updates/YYYY-MM-DD-<kebab-case-slug>.md` menggunakan [docs/updates/TEMPLATE.md](./docs/updates/TEMPLATE.md) (wajib memiliki bagian `## Summary`, `## Changes`, dan `## Verification`).
3. Jika kontrak tipe atau arsitektur berubah, perbarui juga [docs/BLUEPRINT.md](./docs/BLUEPRINT.md) dan [docs/HANDOFF.md](./docs/HANDOFF.md).

---

## 4. Verifikasi Sebelum Push

```bash
npm run check:docs
npm run test
npm run build
```

Semua 3 perintah di atas juga dijalankan otomatis oleh GitHub Actions (`.github/workflows/ci.yml`).
