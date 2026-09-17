# SPECTRA — OTT Audience Segmentation & Personalization Frontend

High-performance, modern React + TypeScript + Tailwind CSS analytics frontend designed for the **Containerized Audience Segmentation & Personalization Service** hackathon platform.

---

## 🌟 Key Capabilities & Architecture

1. **Viewer Analysis (Primary Demo):**
   - Interactive behavioral profile composer with 1-click hackathon persona presets (`USR-8192` Action Marathoner, Casual Quick-Bite, Genre-Explorer, Low-Activity Streamer).
   - Instant edge-case testing buttons matching Section 13 (Empty genres `[]`, Zero watch time `0h`, Extreme binge `350h`, Unseen genre).
   - Real-time network calls to `POST /recommend`.
   - **No Hard-coded ML Results:** Dynamically renders the assigned cluster ID, segment name, calculated Euclidean distance to centroid with radial gauge, roundtrip latency telemetry, and algorithmic recommendation cards.
   - Collapsible Raw JSON Telemetry Inspector for hackathon judges.

2. **Executive Dashboard:**
   - Real-time OTT platform KPIs (Total Audience Pool, Avg Watch Time, Session Length, Active Discovered Clusters).
   - Cluster size & volume distribution stacked visualizer.
   - Genre Affinity concentration index across active audience records.
   - Microservice health telemetry linking to live API.

3. **Discovered Segments Taxonomy:**
   - Deep behavioral profiles for the four canonical clusters (`High-Engagement Action Viewers`, `Casual Short-Session Viewers`, `Genre-Explorers`, `Low-Activity Viewers`).
   - Downstream OTT Personalization Playbook with catalog surfacing focus and push notification triggers.
   - Side-by-side Segment Comparator.

4. **Model Quality & API Robustness Center:**
   - Quantitative clustering metrics: Silhouette Score (0.584), Inertia/Elbow, Davies-Bouldin index, and model determinism.
   - Cluster balance verification.
   - Live interactive 10-test API suite executing Section 13 edge cases against the backend container.
   - `metrics.json` viewer & uploader.

5. **Live API Gateway & Connection Manager:**
   - Real-time connection badge in the top navigation bar with roundtrip ping latency.
   - One-click endpoint target switcher supporting `http://localhost:8000` (FastAPI standard), `http://localhost:5000` (Flask), or any custom host.
   - Live health probe against `GET /health`.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## ⚙️ Environment Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:8000` | Target URL for the Audience Segmentation REST API |

The API URL can also be modified on the fly in the UI using the header connection badge.
