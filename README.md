# Audience Segmentation & Personalization Service

A containerized microservice suite for unsupervised viewer behavioral segmentation and real-time personalized content recommendations.

---

## 1. Problem Overview
Modern streaming media platforms host extensive content catalogs catering to diverse subscriber consumption habits—ranging from high-engagement marathon viewers to casual short-session commuters. Without personalization, users face decision fatigue, platform churn increases, and content discovery suffers.

This service discovers natural audience segments directly from raw viewing telemetry using unsupervised machine learning without synthetic labels or external paid APIs.

---

## 2. Core Solution & Pipeline
The service processes raw telemetric viewing logs and segments subscribers through a unified, deterministic pipeline:
1. **Data Ingestion & Cleaning**: Ingests 10,100 raw telemetric records, removes 100 duplicates, converts clock-drift negative durations, imputes missing values using population medians, recovers malformed genre arrays, and caps extreme 99th-percentile outliers to produce a clean 10,000-subscriber training dataset.
2. **Feature Engineering (15 Dimensions)**: Extracts a 15-dimensional numeric feature vector: `watch_time_hours` (continuous), `avg_session_mins` (continuous), `genre_count` (discrete), and 12 one-hot canonical genre indicators (`Action`, `Thriller`, `Sci-Fi`, `Drama`, `Comedy`, `Romance`, `Documentary`, `Animation`, `Family`, `Horror`, `Crime`, `Adventure`).
3. **Unified Persisted Pipeline**: Combines deterministic feature extraction, z-score standardization, and clustering into an atomic scikit-learn pipeline:
   ```python
   Pipeline([
       ("extractor", ViewerFeatureExtractor()),
       ("scaler", StandardScaler()),
       ("kmeans", KMeans(n_clusters=4, random_state=42, n_init=10, max_iter=300))
   ])
   ```
4. **Zero Runtime Retraining**: The pipeline is fitted once by the `trainer` and serialized to `models/pipeline.joblib`. The `api` service loads this artifact into memory once at startup. Incoming raw user profiles are passed directly into `pipeline.predict()`, guaranteeing identical feature extraction and scaling without runtime retraining or centroid shifting.
5. **Multi-Criteria Cluster Selection ($K=4$)**: Evaluated $K \in [2, 8]$. While $K=8$ achieves a marginally higher raw silhouette score ($0.4281$), it suffers from severe diminishing inertia returns and over-fragments viewers into tiny micro-cohorts ($<6\%$). $K=4$ was selected via multi-criteria analysis (composite score: 0.9050): it captures 69.7% of total potential inertia reduction ($57,394.54$) at the elbow inflection point, delivers a competitive silhouette of $0.4238$, preserves viable cohort balance ($4.64:1$), and provides direct 1-to-1 operational alignment with the 4 target OTT archetypes.

---

## 3. Architecture & Microservices

The application strictly implements the decoupled three-service microservice suite communicating via Docker networking and a shared volume mount (`/models`):

- **`trainer/` (Batch Job)**: Ingests `data/user_activity.csv`, executes cleaning and preprocessing, runs the $K$-sweep, fits the unified pipeline (`ViewerFeatureExtractor -> StandardScaler -> KMeans`), saves `pipeline.joblib` and `metadata.json` to the shared volume, and exits cleanly with code 0.
- **`api/` (FastAPI Daemon)**: Starts once `trainer` completes successfully. Mounts `/models:ro`, exposes `GET /health` (Docker readiness probe) and `POST /recommend` (sub-10ms segment inference, centroid distance calculation, and catalog routing).
- **`evaluator/` (Batch Auditor)**: Starts when the API passes its healthcheck. Executes 15 automated test cases, verifies determinism ($0.0$ variance), recomputes clustering metrics directly on the dataset via shared `common.preprocessing`, outputs `metrics.json`, and exits cleanly with code 0.
- **`frontend/` (Optional Presentation UI)**: React + TypeScript + Vite dashboard visualizing segment clusters, live API health telemetry, and an interactive viewer recommendation sandbox.

All backend containers run as an unprivileged non-root user (`appuser`, UID 1001) based on `python:3.11-slim`.

---

## 4. Key Artifacts & Deliverables

As required by the problem statement, all deliverables are self-contained in the repository:
- **`docker-compose.yml`**: Single-command multi-container orchestration with dependency ordering and healthchecks.
- **`trainer/`**: Complete training, feature engineering, and artifact generation codebase.
- **`api/`**: High-throughput FastAPI inference service with Pydantic v2 input validation and error insulation.
- **`evaluator/`**: Standalone evaluation harness verifying test suites and mathematical metrics.
- **`metrics.json`**: Machine-readable audit evidence containing evaluation metrics, latency statistics, and test outcomes.
- **`REPORT.md`**: Comprehensive 21-section markdown technical report.
- **`REPORT.pdf`**: Publication-ready, 10-page visual PDF technical report.

---

## 5. Project Structure

```
├── api/
│   ├── Dockerfile
│   ├── main.py
│   ├── model_loader.py
│   ├── recommender.py
│   ├── schemas.py
│   ├── test_api.py
│   └── requirements.txt
├── common/
│   ├── __init__.py
│   └── preprocessing.py
├── data/
│   └── user_activity.csv
├── docker-compose.yml
├── evaluator/
│   ├── Dockerfile
│   ├── evaluate.py
│   ├── test_evaluator.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── metrics.json
├── models/
│   ├── metadata.json
│   └── pipeline.joblib
├── README.md
├── REPORT.md
├── REPORT.pdf
└── trainer/
    ├── Dockerfile
    ├── train.py
    ├── cleaning.py
    ├── clustering.py
    ├── feature_engineering.py
    ├── test_trainer.py
    └── requirements.txt
```

---

## 6. How to Run

### Complete System with Docker Compose (Single Command)

To build and run all backend services in sequence:

```bash
docker compose up --build
```

**Startup Execution Flow**:
1. `trainer` builds, cleans the data, fits the pipeline, exports `/models/pipeline.joblib` and `/models/metadata.json`, and terminates with code 0.
2. `api` starts up, loads the pipeline read-only from `/models`, and serves requests on port 8000.
3. `evaluator` triggers upon API healthcheck readiness, runs the 15-case test suite, recomputes metrics, writes `metrics.json` to the host directory, and exits 0.
4. `api` remains active to handle interactive inference requests.

### Interactive API Verification

Verify service health:
```bash
curl -s http://localhost:8000/health
```

Sample recommendation request:
```bash
curl -s -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USR-8192",
    "watch_time_hours": 32.5,
    "top_genres": ["Action", "Thriller"],
    "avg_session_mins": 85.0
  }'
```

Sample recommendation response:
```json
{
  "user_id": "USR-8192",
  "segment_id": 0,
  "segment_name": "High-Engagement Action Viewers",
  "recommendations": [
    "Extraction: Rogue Directive",
    "Shadow Protocol: Berlin",
    "Quantum Paradox (Season 2)",
    "The Dark Horizon",
    "Apex Predator: Hunt"
  ],
  "distance_to_centroid": 1.9151
}
```

### Optional Frontend Web UI

To launch the local presentation dashboard:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 7. Evaluation & Audited Results

All results below are extracted directly from the verified `metrics.json` generated by the independent evaluator container:

### Machine Learning Clustering Quality
- **Silhouette Score**: `0.4238` (Strong cluster separation across 10,000 production records)
- **Inertia (SSE)**: `57,394.54` (Optimal elbow inflection point)
- **Davies-Bouldin Index**: `1.0673` (Low intra-cluster to inter-cluster distance ratio)
- **Calinski-Harabasz Score**: `4,795.60` (Pronounced between-cluster dispersion)
- **Active Clusters ($K$)**: `4`
- **Cluster Balance Ratio**: `4.64 : 1` (Healthy distribution; zero degenerate singletons)
- **Prediction Determinism**: `0.0 variance` across repeated identical requests

### Discovered Audience Segments
| Segment ID | Segment Name | Audience Share | Profile Summary | Content Strategy |
|:---:|:---|:---:|:---|:---|
| **0** | High-Engagement Action Viewers | 3,182 (31.82%) | Watch: 37.53h, Session: 91.35m, Genres: 2.59 (Thriller, Sci-Fi, Action) | High-octane 4K HDR blockbusters & action series |
| **1** | Casual Short-Session Viewers | 3,662 (36.62%) | Watch: 7.92h, Session: 27.37m, Genres: 1.59 (Comedy, Animation, Drama) | Quick-completion comedy specials & sitcoms |
| **2** | Genre-Explorers | 2,367 (23.67%) | Watch: 26.06h, Session: 58.11m, Genres: 4.01 (Adventure, Sci-Fi, Documentary) | Curated foreign films, indie titles & docuseries |
| **3** | Low-Activity Viewers | 789 (7.89%) | Watch: 3.68h, Session: 32.79m, Genres: 1.59 (Family, Drama, Comedy) | Universal Top 10 mainstream hits & family content |

### Automated API Audit Suite (15/15 Passed)
- **Total Tests Executed**: 15 (4 representative archetypes + 11 edge cases)
- **Passed**: 15 / 15 (100% pass rate)
- **Latency Profile**:
  - **Average Latency**: `7.01 ms`
  - **P95 Latency**: `16.37 ms`
  - **Min Latency**: `1.44 ms`
  - **Max Latency**: `21.33 ms` (initial cold-start request)

---

## 8. Limitations & Future Work

### Limitations
1. **Static Catalog Mapping**: Recommendations are rule-mapped from segment metadata rather than an item-level collaborative filtering or matrix factorization engine.
2. **Cold-Start Coarseness**: Users with zero watch time or empty genres map to the `Low-Activity Viewers` cohort; an interactive onboarding taste questionnaire would improve initial precision.
3. **Temporal Invariance**: The model clusters on aggregate monthly snapshots, ignoring intra-week recency, viewing streaks, or seasonal taste shifts.
4. **Batch Retraining**: The clustering model requires periodic offline batch retraining via the `trainer` container to adapt to long-term audience drift.
5. **Single-Node Volume**: Inter-container artifact exchange relies on a local Docker named volume; multi-node deployment would require an object store (e.g., S3/GCS).

### Future Work
- **Hybrid Embedding Retrieval**: Integrate vector search (e.g., Qdrant) over media asset synopsis embeddings within segment boundaries.
- **Automated Drift Monitoring**: Implement Population Stability Index (PSI) and Kolmogorov-Smirnov distribution tests to trigger automated retraining alerts.
- **Contextual Bandits**: Deploy LinUCB for the `Genre-Explorers` cohort to continuously balance exploitation of favored genres with exploration of novel releases.

---

## 9. Hackathon Track & Submission Note
Built for the **Containerized Audience Segmentation & Personalization Service** challenge track. All code is self-contained, CPU-friendly, reproducible, and operates with zero external cloud dependencies.
