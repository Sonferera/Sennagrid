# Code for Change (Global) — Hackathon Submission Checklist

> **Event:** Code for Change (Global)  
> **Devpost URL:** https://code-for-change-global.devpost.com/  
> **Host:** HackathonForEveryone  
> **Submission Deadline:** 1 Desember 2026, 5:00 PM PST (**2 Desember 2026, 08:00 WIB**)  
> **Eligibility:** Students only; clean-room original project built between 5 Nov and 1 Des 2026.

---

## 1. Eligibility & Originality Guardrails
- [x] Seluruh kode **SennaGrid** ditulis baru dari nol di monorepo ini (bukan daur ulang proyek hackathon lain).
- [x] Tidak menggunakan output LLM generatif atau kurva palsu di runtime; seluruh perhitungan bersifat deterministik dan teruji Vitest.
- [ ] Seluruh kode dan dokumentasi telah dipahami, diuji, dan diverifikasi oleh kedua anggota tim sebelum submission.

## 2. Deliverable Wajib Devpost
- [x] **Source Code & Build Instructions:** Monorepo bersih dengan `README.md` publik, `npm run test`, `npm run build`, dan `vercel.json`.
- [ ] **UI End-to-End Lengkap (Owner B):** Split-Screen MapLibre, Timeline 91 hari, KPI Strip, Epidemic Charts + Impact Radar, Dispatch Schedule + Export CSV/JSON, Methodology + Policy Gates, Interactive 4-Step Tour.
- [ ] **Live Deployment (Vercel):** URL produksi aktif, auto-run simulasi default saat halaman dibuka tanpa login.
- [ ] **Demo Video (2–3 menit):** Menunjukkan langsung kontras Reactive vs SennaGrid pada `Metro Tropica (20%)`, pergeseran budget slider, timeline playback, ekspor jadwal CSV, dan verifikasi Policy Gates.
- [ ] **Halaman Proyek Devpost:** Deskripsi masalah sosial, target pengguna, arsitektur teknis, hasil kuantitatif terverifikasi, tantangan, langkah selanjutnya, dan nama anggota tim.

## 3. Judging Criteria Self-Check
1. **Impact:** Angka kasus dicegah, bed ICU diselamatkan, dan penurunan hari kolaps ditampilkan jelas dari solver nyata.
2. **Originality:** Dual synchronized split-screen + checkpointed hybrid block-swap optimizer + live Open-Meteo climate coupling + Policy Gates 100% di browser Web Worker.
3. **Technical Execution:** `npm run test` (100% hijau), `npm run build` (0 error), `npm run check:docs` (lulus), performa `< 1.5s`, konservasi massa `< 1e-9`.
4. **Usability:** Dark-mode kontras tinggi, `tabular-nums`, tanpa emoji dekoratif, responsif, keyboard-accessible, dan *Interactive Tour* 4 langkah.
5. **Clarity of Presentation:** Video demo dan halaman Devpost ringkas, jujur, dan berbasis bukti metrik aktual.
