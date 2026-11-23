# SennaGrid Documentation Index

Direktori `docs/` adalah sumber kebenaran tunggal untuk spesifikasi produk, arsitektur teknis, catatan serah-terima tim, dan riwayat setiap perubahan kode.

---

## Struktur Dokumentasi

| File / Folder | Peran | Kapan Diperbarui |
| :--- | :--- | :--- |
| [PRD.md](./PRD.md) | Product Requirements Document, kriteria juri, dan pembagian kerja 8 hari | Saat scope fitur, KPI, atau timeline berubah |
| [BLUEPRINT.md](./BLUEPRINT.md) | Spesifikasi arsitektur, kontrak tipe, persamaan matematika, dan protokol worker | Saat rumus, tipe data, atau struktur modul berubah |
| [CHANGELOG.md](./CHANGELOG.md) | Log kronologis seluruh perubahan proyek (*Keep a Changelog*) | **Wajib** di setiap update kode (`packages/` atau `apps/`) |
| [HANDOFF.md](./HANDOFF.md) | Panduan integrasi API antar-workspace (Owner A -> Owner B) | Saat API publik `@sennagrid/engine` atau service/worker berubah |
| [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md) | Aturan kompetisi *Code for Change (Global)* & checklist submit Devpost | Menjelang milestone demo, deploy, dan submission |
| `docs/updates/YYYY-MM-DD-<slug>.md` | Catatan rinci per milestone atau fitur baru (mengikuti [TEMPLATE.md](./updates/TEMPLATE.md)) | **Wajib** untuk setiap fitur baru, refactor arsitektur, atau perubahan algoritma |

---

## Aturan Wajib Dokumentasi Setiap Update

Setiap commit atau Pull Request yang mengubah kode di `packages/` atau `apps/` **wajib** memenuhi ketentuan berikut:

1. **Perbarui [CHANGELOG.md](./CHANGELOG.md):** Tambahkan ringkasan perubahan di bawah bagian `[Unreleased]` (atau tanggal terkait) dalam kategori `Added`, `Changed`, `Fixed`, atau `Removed`.
2. **Tambahkan Catatan Update Terstruktur (untuk fitur / milestone / refactor):**
   - Salin [docs/updates/TEMPLATE.md](./updates/TEMPLATE.md) ke `docs/updates/YYYY-MM-DD-<kebab-case-slug>.md`.
   - Wajib memiliki minimal 3 bagian: `## Summary`, `## Changes`, dan `## Verification`.
3. **Sinkronkan Kontrak Teknis:** Jika tipe data, rumus, atau endpoint berubah, perbarui juga [BLUEPRINT.md](./BLUEPRINT.md) dan [HANDOFF.md](./HANDOFF.md).
4. **Verifikasi Otomatis Sebelum Push:**
   ```bash
   npm run check:docs
   npm run test
   npm run build
   ```

Aturan ini ditegakkan secara otomatis oleh:
- `scripts/check-docs.mjs` (`npm run check:docs`)
- `.githooks/pre-commit` (aktifkan lokal dengan `git config core.hooksPath .githooks`)
- `.github/workflows/ci.yml` pada setiap push dan Pull Request ke `main`.
