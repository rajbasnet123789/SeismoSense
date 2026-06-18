# SeismoSense

> AI-powered real-time seismic monitoring, P-wave prediction, and earthquake early warning platform.

SeismoSense ingests live waveform data from global FDSN seismic networks (IRIS), streams it through Apache Kafka, runs TensorFlow Lite inference to detect P-wave arrivals, and surfaces results through a real-time Next.js dashboard with JWT-authenticated REST API.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE                                 │
│                                                                      │
│  ┌────────────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │  FDSN IRIS     │────▶│  Kafka       │────▶│  TFLite Consumer │   │
│  │  Producer     │     │  Topic       │     │  (inference)     │   │
│  │  (ObsPy)       │     │  "Sensor"    │     │                  │   │
│  └────────────────┘     └──────────────┘     └────────┬─────────┘   │
│                                                        │              │
│                                                        ▼              │
│                                              ┌──────────────────┐   │
│                                              │  PostgreSQL      │   │
│                                              │  (Aiven Cloud)   │   │
│                                              └────────┬─────────┘   │
│                                                        │              │
│  ┌──────────────────────────────────────────────────────┴──────────┐ │
│  │                      FASTAPI BACKEND                              │ │
│  │  /health  /signup  /login  /users/me  /predictions              │ │
│  │  /stations  /alerts  /seed                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                           │                                            │
│                           ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                  NEXT.JS FRONTEND                                  │ │
│  │  Dashboard · History · Stations · Alerts · API Ref                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Pipeline Flow

1. **Producer** (`backend/kafka/producer.py`) — Discovers seismic stations from IRIS FDSN at startup, then continuously fetches 3-component (Z, N, E) waveform data in 1-second sliding windows and publishes JSON payloads to Kafka topic `Sensor`.

2. **Kafka Broker** — Aiven Kafka (SSL) — buffers and distributes the telemetry stream.

3. **Consumer** (`backend/kafka/consumer.py`) — Reads waveform messages, pads/clips to 500 samples per channel, applies Z-score standardization, runs TensorFlow Lite inference (`earthquake_model.tflite`), and stores the predicted P-wave probability (along with station code) in PostgreSQL.

4. **Backend API** (`backend/main.py`) — FastAPI server exposing REST endpoints that query the `stream_data` and `users` tables.

5. **Frontend** — Next.js 14 app with real-time dashboard, history logs, station management, alerts, and API reference docs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, CSS-in-JS |
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **ML Inference** | TensorFlow 2.10, TFLite |
| **Streaming** | Apache Kafka (Aiven, SSL), ObsPy |
| **Database** | PostgreSQL 15 (Aiven Cloud), SQLAlchemy 2.0, psycopg 3 |
| **Auth** | JWT (PyJWT), Argon2 password hashing (pwdlib) |
| **Container** | Docker multi-stage (Node → Python+slim) |

---

## Project Structure

```
D:\Project_E\
├── Dockerfile                  # Multi-stage: Node build → Python+Node runtime
├── entrypoint.sh               # Starts uvicorn + next start inside container
├── .dockerignore
├── package.json                # Root orchestrator (concurrently for local dev)
│
├── backend/
│   ├── main.py                 # FastAPI app — all route definitions
│   ├── auth.py                 # JWT creation & validation, get_current_user dependency
│   ├── pyproject.toml          # Python dependencies
│   ├── requirements.txt        # pip freeze dependencies
│   ├── test_db_conn.py         # Database connectivity test script
│   ├── db/
│   │   ├── base.py             # SQLAlchemy engine, SessionLocal, Base, get_db()
│   │   ├── connection.py       # init_db() — table creation, check_connection()
│   │   ├── model.py            # SQLAlchemy ORM models (User, StreamData)
│   │   └── schemas.py          # Pydantic request/response schemas
│   ├── kafka/
│   │   ├── producer.py         # FDSN→Kafka publisher (discovers stations at runtime)
│   │   ├── consumer.py         # Kafka→TFLite→PostgreSQL inference consumer
│   │   ├── ca.pem              # Kafka SSL certificates
│   │   ├── service.cert
│   │   └── service.key
│   └── ai/
│       ├── earthquake_model.tflite  # Trained TFLite model
│       └── Earthquake.ipynb         # Training notebook
│
└── frontend/
    ├── package.json
    ├── next.config.mjs          # API rewrites: /api/* → localhost:8000/*
    └── src/
        ├── app/
        │   ├── layout.js        # Root layout with AppShell
        │   ├── page.js          # Redirects to /signin
        │   ├── globals.css      # Global styles (dark theme)
        │   ├── dashboard/page.js    # Live monitor with stats, waveform, AI panel
        │   ├── history/page.js      # Prediction history table with filters
        │   ├── stations/page.js     # Station management from live API
        │   ├── alerts/page.js       # Alert feed from live API
        │   ├── signin/page.js       # Login form (real JWT auth)
        │   ├── signup/page.js       # Registration form with password strength
        │   └── api-reference/page.js # Interactive API docs
        ├── components/
        │   ├── AppShell.jsx      # Auth guard + sidebar + header layout
        │   ├── Sidebar.jsx       # Icon navigation bar
        │   ├── Header.jsx        # Top bar with live status, station selector, user menu
        │   ├── StatCard.jsx      # Metric card with sparkline/bar chart
        │   ├── WaveformPanel.jsx  # Real-time waveform visualization
        │   ├── AIInferencePanel.jsx # Current inference breakdown
        │   ├── RecentTriggers.jsx  # Recent high-confidence events
        │   └── HyperspeedCanvas.jsx # Animated starfield background
        └── lib/
            └── api.js           # API client (login, signup, getPredictions, getStations, getAlerts, etc.)
```

---

## API Endpoints

All endpoints are served from `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| **GET** | `/health` | No | API health check + DB connectivity test |
| **POST** | `/signup` | No | Register user (name, email, password, optional phone) |
| **POST** | `/login` | No | OAuth2 password flow → JWT access token |
| **GET** | `/users/me` | Bearer | Authenticated user profile |
| **GET** | `/predictions` | No | Paginated P-wave predictions (limit, offset) |
| **GET** | `/predictions/station/{station}` | No | Predictions filtered by station code |
| **GET** | `/stations` | No | Distinct stations with aggregate stats (count, avg p-wave, event count) |
| **GET** | `/alerts` | No | High-confidence events (p_wave > 0.3) formatted as alerts |
| **POST** | `/seed` | No | Insert 30 sample predictions for testing (when Kafka pipeline is off) |

---

## Database Schema

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, auto-increment |
| `name` | String(100) | NOT NULL |
| `email` | String | UNIQUE, NOT NULL, indexed |
| `phone_number` | String(20) | NULLABLE |
| `hashed_password` | String | NOT NULL (Argon2) |
| `created_at` | DateTime | NOT NULL, default UTC now |

### `stream_data`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, auto-increment |
| `station` | String(50) | NOT NULL, indexed (e.g. "KATMN.IU") |
| `p_wave` | Float | NOT NULL (0.0–1.0 probability) |
| `created_at` | DateTime | NOT NULL, default UTC now |

---

## Getting Started — Local Development

### Prerequisites

- Python 3.10+
- Node.js 20+
- Apache Kafka instance with SSL certificates (see `backend/kafka/`)
- PostgreSQL database (Aiven or local)

### 1. Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Set environment variable (or update fallback in `backend/db/base.py`):

```powershell
$env:DATABASE_URL = "postgresql://user:pass@host:port/db?sslmode=require"
```

Run the API server:

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`. API calls to `/api/*` are proxied to `http://localhost:8000/*` via Next.js rewrites.

### 3. Run Kafka Pipeline (optional, for live data)

Start the producer (fetches from IRIS FDSN, publishes to Kafka):

```powershell
cd backend
python kafka/producer.py
```

Start the consumer (reads from Kafka, runs ML inference, saves to DB):

```powershell
python kafka/consumer.py
```

### 4. Run Both Simultaneously

From project root:

```powershell
npm run dev
```

Uses `concurrently` to run backend (uvicorn, port 8000) and frontend (next dev, port 3000) in parallel.

---

## Docker Deployment

Build the combined image:

```powershell
docker build -t seismosense .
```

Run the container:

```powershell
docker run -p 3000:3000 -p 8000:8000 `
  -e DATABASE_URL="postgresql+psycopg://user:pass@host:port/db?sslmode=require" `
  seismosense
```

The entrypoint script:
1. Initializes database tables
2. Starts uvicorn (backend, port 8000) in background
3. Starts Next.js (frontend, port 3000) in background
4. Waits for either process, then shuts down the other

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | Aiven cloud URL (fallback) | PostgreSQL connection string |
| `JWT_SECRET_KEY` | No | `"super-secret-seismosense-key-change-in-production"` | JWT signing key |
| `NEXT_PUBLIC_API_URL` | No | `/api` | Frontend API base URL |

---

## Key Design Decisions

- **Single Docker image** — Both frontend and backend run in one container behind a single entrypoint script, simplifying deployment to one command.
- **No fake data** — All frontend pages fetch from real backend endpoints (`/stations`, `/alerts`, `/predictions`). The `/seed` endpoint exists only for controlled testing when the Kafka pipeline is offline.
- **Dynamic station discovery** — The producer calls `client.get_stations()` at startup to discover stations from IRIS FDSN rather than hardcoding a single station. Stations in the frontend come from whatever data flows through the pipeline.
- **Auth via JWT + Argon2** — No demo bypass. All protected routes require a valid Bearer token obtained from `/login`.
- **Frontend API proxy** — Next.js rewrites `/api/*` → `localhost:8000/*` so the frontend never needs to know the backend host in production.
