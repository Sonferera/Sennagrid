# Product Requirements Document (PRD) — SennaGrid

> **Product Name:** SennaGrid — Spatial Epidemic Digital Twin & Constrained Resource Optimizer  
> **Hackathon:** Code for Change (Global) — Devpost (`https://code-for-change-global.devpost.com/`)  
> **Submission Deadline:** 1 Desember 2026, 5:00 PM PST (**2 Desember 2026, 08:00 WIB**)  
> **Build Window:** 23 November – 1 Desember 2026 (Clean-room original build)  
> **Team Size:** 2 Students  
> **Target Deployment:** Static Web App on Vercel (100% Client-Side Computation)

---

## 1. Executive Summary & Social Impact

### 1.1 Problem Statement
Saat terjadi wabah penyakit menular di kawasan perkotaan (seperti wabah Demam Berdarah/Dengue atau wabah pernapasan akut), Dinas Kesehatan daerah hampir selalu menghadapi **keterbatasan sumber daya operasional**. Tim pengendalian vektor (*fogging*/larvasida) atau stok distribusi vaksin mingguan umumnya hanya mampu menjangkau **10%–40% distrik** per minggu.

Dalam praktik standar (*Reactive / Status Quo*), intervensi hampir selalu diarahkan ke distrik dengan **jumlah kasus aktif terbanyak saat ini**. Pendekatan ini memiliki kelemahan fatal:
- **Terlambat membendung transmisi lintas wilayah:** Distrik *transit hub* dengan mobilitas tinggi sudah mengekspor infeksi ke distrik pinggiran sebelum kasusnya memuncak.
- **Asimetri kapasitas rumah sakit:** Distrik padat berkapasitas ICU kecil lebih cepat kolaps dibanding pusat kota yang memiliki rumah sakit besar.

Akibatnya, rumah sakit tetap mengalami **kolaps ICU**, bukan semata karena anggaran kurang, melainkan karena **alokasi mingguan tidak memperhitungkan struktur jaringan mobilitas dan proyeksi lonjakan**.

### 1.2 Product Vision
**SennaGrid** adalah *spatial epidemic digital twin* dan *mathematical resource optimizer* berbasis browser yang memungkinkan perencana kesehatan publik mensimulasikan penyebaran wabah selama **91 hari (13 minggu)** dan membandingkan secara langsung (**split-screen**) strategi **Reactive Baseline** melawan **SennaGrid Predictive Optimizer** pada **anggaran yang sama persis**.

### 1.3 Value Proposition
1. **Bukti Kuantitatif & Visual Seketika:** Menunjukkan secara presisi berapa kasus yang berhasil dicegah, berapa bed ICU puncak yang diselamatkan, dan berapa hari kolaps rumah sakit yang dihindari dengan anggaran yang identik.
2. **Transparan & Dapat Diaudit (*Zero Hallucination*):** Tidak memakai LLM/AI generatif untuk menebak angka. Semua kurva, peta, dan jadwal dihasilkan oleh solver persamaan diferensial (**RK4**) dan optimizer deterministik dengan pengecekan konservasi massa real-time.
3. **Siap Operasional:** Menghasilkan **Dispatch Schedule Mingguan (Weeks 1–13)** lengkap dengan alasan deterministik per distrik serta ekspor **CSV & JSON**.
4. **Zero-Friction & Zero-Cost:** 100% berjalan di sisi klien (*Web Worker + Float64Array*), tanpa login, tanpa server backend, dan tanpa API key berbayar.

---

## 2. Target Users & Personas

| Persona | Kebutuhan Utama | Fitur Kunci di SennaGrid |
| :--- | :--- | :--- |
| **Perencana Dinas Kesehatan / EOC** | Menentukan distrik prioritas tiap minggu dengan kapasitas tim/vaksin terbatas agar RS tidak kolaps. | Budget Slider (`10%–40%`), Split-Screen Map, Dispatch Schedule + Export CSV/JSON. |
| **Epidemiolog Kota** | Memvalidasi asumsi model (mobilitas komuter, efek suhu/hujan, parameter penyakit, konservasi populasi). | Disease Mode Toggle (`SEIR-SEI` & `SEIR`), Live Weather Open-Meteo, Panel `Methodology & Math` & Policy Gates. |
| **Juri Hackathon (*Code for Change*)** | Memahami masalah sosial, verifikasi teknis, dan merasakan langsung dampak produk dalam < 60 detik. | Auto-run simulasi saat halaman dibuka, KPI Impact Strip, Impact Radar, Timeline 91 hari, & Interactive 4-Step Tour. |

---

## 3. Alignment dengan Kriteria Penilaian Devpost

| Kriteria Juri | Strategi Produk SennaGrid |
| :--- | :--- |
| **1. Impact** | Mengatasi masalah nyata kolaps layanan kesehatan & keterbatasan anggaran daerah pada wabah vektor (Dengue/iklim) maupun respirasi; menampilkan KPI *Cases Averted*, *Peak ICU Overflow Prevented*, dan *Collapse Days Saved*. |
| **2. Originality** | Menggabungkan *dual synchronized split-screen simulation* + *network-aware 1-swap receding-horizon optimizer* + *real-time Open-Meteo climate coupling* + *Policy & Integrity Gates* sepenuhnya di Web Worker browser. |
| **3. Technical Execution** | Mesin matematika TypeScript murni (`Float64Array`, RK4 $\Delta t = 0.25$), checkpointed local search `< 1.5s`, unit test `vitest` (konservasi massa `< 1e-6`, dominasi biaya), serta fallback cuaca deterministik. |
| **4. Usability** | Langsung terbuka dengan simulasi aktif (tanpa setup), UI *dark-mode* berstandar *mission-control*, `tabular-nums`, *synchronized pan/zoom*, klik inspektor distrik, dan *Interactive Tour* 4 langkah. |
| **5. Clarity of Presentation** | Visual *side-by-side* merah vs cyan langsung membedakan kegagalan strategi reaktif vs keberhasilan strategi prediktif; didukung *Optimization Swap Trace* dan panel *Methodology & Math*. |

---

## 4. Scope & Functional Requirements

### 4.1 Core Control & Configuration (`FR-01` – `FR-03`)
- **`FR-01` Preset Wilayah Switchable:** Pengguna dapat memilih minimal 2 skenario kota dengan poligon GeoJSON valid dan tidak tumpang-tindih:
  1. **Metro Tropica (Default — 18 Distrik):** Cekungan urban tropis padat dengan CBD bermobilitas tinggi dan distribusi bed ICU tidak merata (optimal untuk mode Vector-Borne Dengue).
  2. **Harbor Corridor (16 Distrik):** Koridor pesisir linear dengan *transport bottleneck* antara pelabuhan, pusat kota, dan zona hunian (optimal untuk mode Respiratory SEIR).
- **`FR-02` Dual Disease Mode:**
  - **Mode A (Default): Vector-Borne SEIR-SEI (Dengue / Arbovirus)** — terkopel dengan suhu dan curah hujan 7-hari bergulir.
  - **Mode B: Direct-Contact SEIR (Respiratory / Vaccination)** — transmisi antarmanusia terkopel matriks mobilitas.
- **`FR-03` Budget Constraint & Parameter Tuning:**
  - Slider **Weekly Intervention Budget** ($B \in [10\%, 40\%]$, langkah `5%`, default `20%`), menentukan kuota maksimal $K = \max(1, \lfloor B \cdot N \rfloor)$ distrik per minggu.
  - Panel *Advanced Parameters* (opsional terlipat): $\rho_{\text{ICU}}$, $m_{\text{out}}$, efikasi intervensi, dengan tombol *Reset Defaults*.
  - Tombol **`Run Optimization`** dengan pembacaan waktu eksekusi (`Solved in XXX ms`) serta auto-run saat pertama kali aplikasi dimuat.

### 4.2 View 1: Simulator (`FR-04` – `FR-08`)
- **`FR-04` KPI Impact Comparison Strip (4 Kartu + Impact Radar):**
  - *Total Cases Averted* (jumlah absolut & `%` reduksi)
  - *Peak ICU Overflow Prevented* (jumlah bed ICU terselamatkan di puncak gelombang)
  - *Hospital Collapse Days* (`Reactive: X days` vs `SennaGrid: Y days`)
  - *Solver Performance* (jumlah kandidat iterasi dievaluasi + waktu eksekusi ms)
  - *Impact Radar Chart (5-Axis Summary):* Perbandingan visual ternormalisasi antara Reactive vs SennaGrid (Cases Control, Peak ICU Safety, Collapse Prevention, Hub Containment, Budget Efficiency).
- **`FR-05` Synchronized Split-Screen Map (`maplibre-gl`):**
  - Kiri: **Reactive Baseline** (aksen Rose/Amber). Kanan: **SennaGrid Strategy** (aksen Cyan/Emerald).
  - *Synchronized Camera:* Pan, zoom, dan bearing kedua peta terkunci sinkron tanpa jitter/infinite loop.
  - *Visual Encoding:* Warna isi poligon memetakan tingkat stres ICU / insidensi infeksi per distrik; distrik yang sedang diintervensi pada minggu aktif diberi border terang tegas.
  - *District Inspector:* Mengklik distrik mana pun membuka panel inspeksi berdampingan menampilkan populasi, indeks sentralitas mobilitas, beban ICU vs kapasitas (Reactive vs SennaGrid), dan status intervensi minggu berjalan.
- **`FR-06` Shared 91-Day Playback Timeline:**
  - Play / Pause, pilihan kecepatan (`1x`, `2x`, `4x`), dan slider hari (`Day 0` – `Day 91`, menampilkan label `Week 1` – `Week 13`).
- **`FR-07` Synchronized Epidemic & ICU Capacity Charts:**
  - Chart A: **Active Infections Over Time** (kurva putus-putus Rose = Reactive vs kurva solid Cyan = SennaGrid, lengkap dengan playhead vertikal sinkron).
  - Chart B: **City-Wide ICU Demand vs Total Capacity** (garis ambang batas kapasitas merah horizontal untuk memperlihatkan jendela kolaps yang berhasil dihindari).
- **`FR-08` Live Weather Indicator:**
  - Pill status: `Live Weather: Open-Meteo` atau `Fallback Climatology` disertai ringkasan suhu rata-rata & curah hujan yang memodulasi Mode A.

### 4.3 View 2: Dispatch Schedule (`FR-09` – `FR-10`)
- **`FR-09` Actionable Weekly Dispatch Table (Weeks 1–13):**
  - Dapat difilter berdasarkan minggu, jenis zona, atau *rationale tag*.
  - Menampilkan distrik terpilih, jenis aksi (`Vector Control / Fogging` atau `Targeted Vaccination`), rationale deterministik (`Mobility Hub Containment`, `Pre-emptive Surge Intercept`, `ICU Capacity Shield`), dan estimasi kontribusi pengurangan risiko.
  - **Optimization Swap Trace:** Panel ringkas yang menunjukkan riwayat perbaikan utama dari Stage 2 (*1-Swap Coordinate Descent*)—misalnya bagaimana memindahkan alokasi dari distrik X ke hub Y pada minggu $w$ menurunkan total overflow ICU.
- **`FR-10` Operational Export:**
  - Tombol **`Export Plan (CSV)`** (jadwal mingguan siap pakai tim lapangan) dan **`Export Full Run (JSON)`** (parameter, cuaca, schedule, KPI, dan kurva harian).

### 4.4 View 3: Methodology & Math (`FR-11` – `FR-12`)
- **`FR-11` Mathematical Transparency Panel:**
  - Menampilkan formulasi Gravity Mobility Matrix, persamaan SEIR-SEI / SEIR, modulasi iklim, dan fungsi objektif optimizer $J(U)$ secara rapi.
- **`FR-12` Policy & Integrity Gates (5 Deterministic Checks):**
  - Diadaptasi secara bersih ke domain epidemiologi: menampilkan status `PASS / REVIEW / FAIL`, skor keseluruhan (`0–100`), dan nilai terukur aktual dari run aktif:
    1. *Mass Conservation Integrity* (`Max Error < 1e-9`)
    2. *Weekly Budget Compliance* (`<= K districts/week`)
    3. *Objective Dominance vs Reactive* (`J_opt < J_react`)
    4. *ICU Collapse Prevention* (perbandingan hari overflow)
    5. *Early Mobility Hub Coverage* (cakupan hub teratas di 4 minggu awal)

### 4.5 Onboarding (`FR-13`)
- **`FR-13` Interactive Judge Walkthrough:** Tur 4 langkah opsional yang dapat dibuka ulang kapan saja (`Tour` button di header) untuk memandu pengguna baru menyorot Split Map, Budget Slider, Timeline, dan Dispatch Export.

---

## 5. Non-Functional Requirements (NFR)

- **`NFR-01` Latency & Responsiveness:** Eksekusi optimasi penuh (Reactive + Stage 1 + hingga 250 iterasi Stage 2) selesai dalam **< 1.500 ms** di Web Worker tanpa memblokir UI thread.
- **`NFR-02` Rendering Smoothness:** Playback animasi peta & playhead grafik berjalan mulus di **60 FPS** tanpa re-inisialisasi sumber GeoJSON penuh di setiap frame (cukup update feature-state atau properti efisien).
- **`NFR-03` Numerical Integrity:** Nol nilai `NaN`/`Infinity`; konservasi populasi $|S_i + E_i + I_i + R_i - N_i| / N_i < 10^{-9}$.
- **`NFR-04` Aesthetic Discipline:** High-contrast *dark-mode analytical workbench*, **nol emoji dekoratif** di seluruh UI, angka wajib `tabular-nums` / monospace, ikon garis minimal via `lucide-react`.
- **`NFR-05` Resilience:** Kegagalan jaringan ke Open-Meteo atau MapLibre basemap tidak boleh menyebabkan layar putih atau crash (wajib ada fallback klimatologi lokal dan background dark-grid canvas).
- **`NFR-06` Clean-Room Originality:** Seluruh kode ditulis baru selama periode hackathon *Code for Change (Global)* dan terverifikasi unit test `vitest`.

---

## 6. Out of Scope (Explicit Guardrails)
Untuk menjaga fokus dan keandalan dalam sisa waktu ~8 hari, item berikut **tidak masuk cakupan**:
- Backend server (Express/FastAPI), database, autentikasi user, atau penyimpanan cloud.
- Integrasi LLM/chatbot runtime (Gemini/Groq API key) yang bisa gagal, berbiaya, atau menghasilkan angka non-deterministik.
- Unggah shapefile/GeoJSON arbitrary dari user (cukup 2 preset yang tervalidasi penuh; dapat dicatat di bagian *Future Work*).
- Pemodelan level molekuler / *peptide docking* (menjaga identitas produk tetap tajam pada kesehatan publik perkotaan).

---

## 7. Team Execution Plan (23 Nov – 1 Des 2026)

Pembagian kerja paralel untuk 2 mahasiswa (**Owner A: Engine, Data & Worker** | **Owner B: UI, MapLibre, Visualisasi & Submission**):

| Hari | Tanggal | Owner A (Math & Data) | Owner B (UI & Visualisasi) | Milestone Verifikasi |
| :--- | :--- | :--- | :--- | :--- |
| **Hari 1** | 23 Nov | Inisialisasi repo Vite + TS + Vitest; `types.ts`, `mobility.ts`, `climate.ts` | Setup Tailwind dark theme, layout shell, `ControlBar`, & design tokens | `npm run test` (mobility & climate pass) |
| **Hari 2** | 24 Nov | `solver.ts` (RK4 SEIR-SEI & SEIR + checkpointing) & `solver.test.ts` | `TimelinePlayer` & `KpiStrip` dengan mock state | Error konservasi `< 1e-9` lolos Vitest |
| **Hari 3** | 25 Nov | `optimizer.ts` (Reactive + Stage 1 + Stage 2 + Swap Trace) + `gates.ts` | `SplitMapView` (dual `maplibre-gl` + camera sync lock) | Optimizer menang di semua budget preset (`15%, 20%, 30%`) |
| **Hari 4** | 26 Nov | `metroTropica.ts` (18 distrik) & `harborCorridor.ts` (16 distrik) + `weather.ts` + `optimizer.worker.ts` | Integrasi Web Worker ke Zustand store + District Inspector | Default run (`20%` Metro Tropica) memperlihatkan ICU breach di Reactive & dicegah SennaGrid |
| **Hari 5** | 27 Nov | Kalibrasi parameter agar 2 preset & 2 mode penyakit meyakinkan secara visual | `EpidemicCharts` (Active Infections + ICU Threshold + Impact Radar) | Grafik & playhead sinkron 60 FPS |
| **Hari 6** | 28 Nov | Edge-case tests (offline weather, slider cepat/race condition worker) | `DispatchSchedule` (tabel, filter, Swap Trace, CSV/JSON export) + `MethodologyView` (rumus + Policy Gates) | Export CSV/JSON & seluruh tab berfungsi |
| **Hari 7** | 29 Nov | Code cleanup, strict lint/TS check, `npm run build` | `InteractiveTour` 4 langkah, responsivitas layar, polish visual tanpa emoji | Production build zero error + deploy Vercel preview |
| **Hari 8** | 30 Nov – 1 Des | Final `README.md` publik + verifikasi link live | Rekam & edit video demo (~2–3 menit) + isi form Devpost | **Submit lengkap sebelum 2 Des 08:00 WIB** |
