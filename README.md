# EV BMS Data Analyzer — 3-Layer Architecture

A lightweight, zero-dependency, deployable web application and API service for ingesting, validating, and performing descriptive analysis on Electric Vehicle (EV) Battery Management System (BMS) time-series telemetry.

---

## 🏗️ 3-Layer System Architecture

The application is structured into three clean, decoupled architectural layers:

```
+-----------------------------------------------------------------------------------+
| LAYER 1: FRONTEND LAYER (UI & Visual Presentation)                               |
| Location: /src/components, /src/App.tsx, /src/main.tsx, /src/index.css             |
| - React 19 single-page application                                               |
| - High-performance native SVG Oscilloscope & Waveform HUD                         |
| - Data table with cell-level quality flag annotations                             |
| - Plausibility configuration & Documentation modals                               |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| LAYER 2: MIDDLE LAYER (Domain Logic & Mathematical Processing)                    |
| Location: /src/middle/                                                            |
| - bmsParser.ts: RFC-compliant CSV parser, header normalizer & quality screener   |
| - bmsAggregator.ts: Driving/charging session segmenter & numerical integrator     |
|   (trapezoidal Ah & kWh throughput, thermal exposure duration metrics)            |
| - bmsExporter.ts: CSV and JSON serialization & download helpers                   |
| - types.ts: Domain models, schemas, and default screening configurations          |
| - sampleData.ts: Reference standard, fleet, and discrepancy test datasets         |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| LAYER 3: BACKEND LAYER (Server & REST Services)                                   |
| Location: /server.ts, /src/backend/router.ts                                      |
| - Express HTTP server on port 3000                                                |
| - In Development: mounts Vite dev middleware (SPA hot-reloading)                  |
| - In Production: serves optimized static assets from dist/                        |
| - REST API Endpoints:                                                             |
|   * GET  /api/health               -> Service status and layer map               |
|   * POST /api/analyze              -> Full parsing, screening & aggregation API   |
|   * POST /api/validate             -> Quality audit discrepancy extraction only  |
|   * GET  /api/samples              -> Reference demonstration datasets            |
|   * GET  /api/config/defaults      -> Default screening plausibility limits       |
|   * GET  /api/download-project-zip -> Streams the complete 3-layer project .zip   |
+-----------------------------------------------------------------------------------+
```

---

## 📦 Project ZIP Archive

A standalone, self-contained ZIP archive of this 3-layer project is generated at the project root:
- File name: `ev-bms-analyzer-3layer.zip`
- Can be downloaded directly inside the application UI via the **"Project ZIP"** button in the header bar.
- Can be downloaded programmatically via `GET /api/download-project-zip`.
- Can be re-generated anytime using:
  ```bash
  python3 scripts/create_zip.py
  ```

---

## ⚠️ Scope & Analytical Boundaries

- **Pure Descriptive Statistics & Data-Quality Screening**: Computes transparent numerical summaries (means, min/max bounds, deltas, charge throughput, and thermal exposure duration).
- **No AI / External Cloud LLM Models**: Does not use, call, or require any AI API, LLM API, cloud AI service, or external model.
- **Not a Battery Fault Diagnostic**: Does not claim to detect cell faults, diagnose lithium plating, estimate validated State-of-Health (SoH), or predict Remaining Useful Life (RUL). Actual fault detection requires calibrated electrochemical twin models and machine-learning models trained on laboratory-validated defect datasets with trustworthy ground truth.
- **Configurable Screening Defaults**: Plausibility limits are screening defaults to catch corrupt sensors or malformed packets; they are not universal standard battery fault thresholds.

---

## 🚀 Running the Project

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack 3-layer dev server (Express + Vite on port 3000)
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm run start
```

Access the application in your browser at `http://localhost:3000`.

---

## 🔬 Telemetry Data Schema

| Field | Type | Description |
|---|---|---|
| `timestamp` | String / ISO 8601 | Datetime stamp (e.g., `2026-10-22T08:00:00Z` or UNIX epoch) |
| `vehicle_id` | String | Vehicle identifier (e.g., `EV-FLEET-101`) |
| `voltage_v` | Number | Pack terminal voltage in Volts (V) |
| `current_a` | Number | Pack current in Amperes (A). Negative = discharge, Positive = charge |
| `temperature_c`| Number | Battery temperature in degrees Celsius (°C) |
| `soc_pct` | Number | State of Charge percentage (0 - 100%) |
| `mode` | String (optional)| Operating mode: `driving`, `charging`, `idle` |
