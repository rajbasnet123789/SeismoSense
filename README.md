# SeismoSense

> AI-powered real-time seismic monitoring, P-wave prediction, and earthquake early warning platform.

SeismoSense ingests live waveform data from global FDSN seismic networks (IRIS), streams it through Apache Kafka, runs TensorFlow Lite inference to detect P-wave arrivals, and surfaces results through a real-time Next.js dashboard with JWT-authenticated REST API.

---

## Architecture

Everything runs in a **single Docker container** on Render (one URL, one port):

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE DOCKER CONTAINER                       │
│                                                                  │
│  ┌────────────────┐     ┌──────────────┐     ┌──────────────┐  │
│  │  FDSN IRIS     │────▶│  Kafka       │────▶│  TFLite      │  │
│  │  Producer     │     │  Topic       │     │  Consumer    │  │
│  │  (ObsPy)       │     │  "Sensor"    │     │  (inference) │  │
│  └────────────────┘     └──────────────┘     └──────┬───────┘  │
│                                                      │           │
│                                                      ▼           │
│                                            ┌──────────────┐     │
│                                            │  PostgreSQL   │     │
│                                            │  (Aiven)      │     │
│                                            └──────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FASTAPI (uvicorn :8000)                       │   │
│  │  API routes: /health /signup /login /predictions /etc     │   │
│  │  Static files: serves Next.js build (frontend/out/)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Flow

1. **Producer** (`backend/kafka/producer.py`) — Discovers seismic stations from IRIS FDSN at startup, then continuously fetches 3-component (Z, N, E) waveform data in 1-second sliding windows and publishes JSON payloads to Kafka topic `Sensor`.

2. **Kafka Broker** — Aiven Kafka (SSL) — buffers and distributes the telemetry stream.

3. **Consumer** (`backend/kafka/consumer.py`) — Reads waveform messages, pads/clips to 500 samples per channel, applies Z-score standardization, runs TensorFlow Lite inference (`earthquake_model.tflite`), and stores the predicted P-wave probability (along with station code) in PostgreSQL.

4. **Backend API** (`backend/main.py`) — FastAPI server exposing REST endpoints + serving the static Next.js frontend from a single port.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (static export), React 18, CSS-in-JS |
| **Backend** | Python 3.10, FastAPI, Uvicorn |
| **ML Inference** | TensorFlow 2.10, TFLite |
| **Streaming** | Apache Kafka (Aiven, SSL), ObsPy |
| **Database** | PostgreSQL 15 (Aiven Cloud), SQLAlchemy 2.0, psycopg 3 |
| **Auth** | JWT (PyJWT), Argon2 password hashing (pwdlib) |
| **Container** | Docker multi-stage (Node build → Python slim runtime) |
| **Deploy** | Render (single Docker service, free tier) |

---

## Project Structure

```
D:\Project_E\
├── Dockerfile                  # Multi-stage: Node builds frontend → Python serves everything
├── entrypoint.sh               # (legacy) old entrypoint, no longer used
├── .dockerignore
├── render.yaml                 # Single Docker service config
├── package.json                # Root orchestrator (concurrently for local dev)
│
├── backend/
│   ├── main.py                 # FastAPI app — API routes + static frontend serving
│   ├── auth.py                 # JWT creation & validation, get_current_user dependency
│   ├── requirements.txt        # pip dependencies (numpy pinned for TF 2.10)
│   ├── test_db_conn.py         # Database connectivity test script
│   ├── db/
│   │   ├── base.py             # SQLAlchemy engine, SessionLocal, Base, get_db()
│   │   ├── connection.py       # init_db() — table creation, check_connection()
│   │   ├── model.py            # SQLAlchemy ORM models (User, StreamData)
│   │   └── schemas.py          # Pydantic request/response schemas
│   ├── kafka/
│   │   ├── producer.py         # FDSN→Kafka publisher (lazy connections, env var paths)
│   │   ├── consumer.py         # Kafka→TFLite→PostgreSQL inference consumer
│   │   ├── ca.pem              # (local dev only) Kafka SSL certificates
│   │   ├── service.cert
│   │   └── service.key
│   └── ai/
│       ├── earthquake_model.tflite  # Trained TFLite model
│       └── Earthquake.ipynb         # Training notebook
│
└── frontend/
    ├── package.json
    ├── next.config.mjs          # Static export: output='export', trailingSlash=true
    └── src/
        ├── app/
        │   ├── layout.js        # Root layout with AppShell
        │   ├── page.js          # Client-side redirect to /signin
        │   ├── globals.css      # Global styles (dark theme)
        │   ├── dashboard/page.js
        │   ├── history/page.js
        │   ├── stations/page.js
        │   ├── alerts/page.js
        │   ├── signin/page.js
        │   ├── signup/page.js
        │   └── api-reference/page.js
        ├── components/
        │   ├── AppShell.jsx
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── StatCard.jsx
        │   ├── WaveformPanel.jsx
        │   ├── AIInferencePanel.jsx
        │   ├── RecentTriggers.jsx
        │   └── HyperspeedCanvas.jsx
        └── lib/
            └── api.js           # API client (calls same-origin FastAPI directly)
```

---

## API Endpoints

All endpoints served from the same origin (e.g. `https://seismosense.onrender.com`). Interactive docs at `/docs`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| **GET** | `/health` | No | API health check + DB connectivity test |
| **POST** | `/signup` | No | Register user (name, email, password, optional phone) |
| **POST** | `/login` | No | OAuth2 password flow → JWT access token |
| **GET** | `/users/me` | Bearer | Authenticated user profile |
| **GET** | `/predictions` | No | Paginated P-wave predictions (limit, offset) |
| **GET** | `/predictions/station/{station}` | No | Predictions filtered by station code |
| **GET** | `/stations` | No | Distinct stations with aggregate stats |
| **GET** | `/alerts` | No | High-confidence events (p_wave > 0.3) formatted as alerts |

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

Opens at `http://localhost:3000`.

### 3. Run Kafka Pipeline (optional, for live data)

Start the producer:

```powershell
cd backend
python kafka/producer.py
```

Start the consumer:

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

## Docker Compose (Recommended Local Dev)

Run both **backend** (FastAPI :8000) and **realtime-ui** (Vite + Nginx :5173) together:

### Prerequisites

- Docker & Docker Compose installed
- `.env` file in project root with:

```env
DATABASE_URL=postgresql+psycopg://user:pass@host:port/db?sslmode=require
KAFKA_BOOTSTRAP_SERVERS=kafka-xxx.aivencloud.com:16755
```

Kafka SSL certs should be at `backend/kafka/ca.pem`, `backend/kafka/service.cert`, `backend/kafka/service.key`.

### Commands

```powershell
# Build images (no cache)
docker compose build --no-cache

# Start services in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild and restart a single service (e.g. backend)
docker compose up -d --no-deps --build backend

# Remove everything (volumes too)
docker compose down -v
```

- **Backend API**: http://localhost:8000
- **Realtime UI**: http://localhost:5173
- **API Docs (Swagger)**: http://localhost:8000/docs

---

## Docker Deployment (Single Container)

Build the combined image:

```powershell
docker build -t seismosense .
```

Run locally:

```powershell
docker run -p 8000:8000 `
  -e DATABASE_URL="postgresql+psycopg://user:pass@host:port/db?sslmode=require" `
  -e KAFKA_BOOTSTRAP_SERVERS="kafka-xxx.aivencloud.com:16755" `
  -e KAFKA_SSL_CAFILE="/path/to/ca.pem" `
  -e KAFKA_SSL_CERTFILE="/path/to/service.cert" `
  -e KAFKA_SSL_KEYFILE="/path/to/service.key" `
  seismosense
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | No | JWT signing key (auto-generated on Render) |
| `KAFKA_BOOTSTRAP_SERVERS` | Yes | Aiven Kafka bootstrap server URL |
| `KAFKA_SSL_CAFILE` | Yes | Path to `ca.pem` SSL certificate |
| `KAFKA_SSL_CERTFILE` | Yes | Path to `service.cert` SSL certificate |
| `KAFKA_SSL_KEYFILE` | Yes | Path to `service.key` SSL private key |
| `MODEL_PATH` | No | Path to TFLite model (defaults to `backend/ai/earthquake_model.tflite`) |

---

## Render Deployment

Single Docker service configured via `render.yaml`.

### Setup Checklist

1. **Create service**: Render → New → Docker → point to this repo
2. **Secret Files** (Settings → Secret Files):

   | File | Mount Path |
   |------|-----------|
   | `ca.pem` | `/etc/secrets/ca.pem` |
   | `service.cert` | `/etc/secrets/service.cert` |
   | `service.key` | `/etc/secrets/service.key` |

3. **Environment Variables** (Environment tab):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Aiven PostgreSQL connection string |
   | `KAFKA_BOOTSTRAP_SERVERS` | `kafka-1995170-rajbasnet2027-20e5.c.aivencloud.com:16755` |
   | `KAFKA_SSL_CAFILE` | `/etc/secrets/ca.pem` |
   | `KAFKA_SSL_CERTFILE` | `/etc/secrets/service.cert` |
   | `KAFKA_SSL_KEYFILE` | `/etc/secrets/service.key` |

4. **Aiven IP Allowlist**: Free tier Render has no static outbound IP. Set Aiven IP allowlist to `0.0.0.0/0` or disable IP restrictions.

5. **Deploy**: Push to `main` branch, Render auto-deploys.

---

## Troubleshooting

### Kafka Timeout (`KafkaTimeoutError: Unable to bootstrap from ...`)

**Cause**: Render can't reach the Aiven Kafka broker.

**Checklist**:
- [ ] Secret files are uploaded in Render dashboard with correct mount paths
- [ ] Env vars `KAFKA_SSL_CAFILE`, `KAFKA_SSL_CERTFILE`, `KAFKA_SSL_KEYFILE` match the mount paths exactly
- [ ] `KAFKA_BOOTSTRAP_SERVERS` env var is set correctly
- [ ] Aiven IP allowlist is set to `0.0.0.0/0` (Render free tier has no static IPs)
- [ ] Aiven service is running (check Aiven console)

### NumPy / TensorFlow Crash (`_ARRAY_API not found`)

**Cause**: NumPy 2.x installed but TF 2.10 needs NumPy 1.x.

**Fix**: `requirements.txt` already pins `numpy>=1.23.0,<1.24.0`. If the issue persists, clear Render build cache and redeploy.

### Frontend Shows 404

**Cause**: Frontend static files not built or not found.

**Checklist**:
- [ ] Dockerfile multi-stage build completed successfully (check build logs for `npm run build`)
- [ ] `frontend/out/` directory exists in the built image
- [ ] `next.config.mjs` has `output: 'export'`

### `/stations` Returns 500 (`can't subtract offset-naive and offset-aware datetimes`)

**Cause**: PostgreSQL returns naive datetimes but code compared with timezone-aware.

**Fix**: Already fixed in `main.py` — uses `datetime.utcnow()` for comparison.

---

## Key Design Decisions

- **Single container** — Frontend (static export), backend API, Kafka producer, and Kafka consumer all run in one Docker container on one port. No separate services needed.
- **No fake data** — All frontend pages fetch from real backend endpoints. The `/seed` endpoint exists only for controlled testing when the Kafka pipeline is offline.
- **Dynamic station discovery** — The producer calls `client.get_stations()` at startup to discover stations from IRIS FDSN rather than hardcoding.
- **Auth via JWT + Argon2** — No demo bypass. All protected routes require a valid Bearer token obtained from `/login`.
- **Static frontend** — Next.js builds to static HTML/JS/CSS. FastAPI serves these files, eliminating the need for a separate Node.js server in production.
- **Lazy Kafka connections** — Producer and consumer create Kafka clients inside their run functions (not at import time), so the API server starts cleanly even if Kafka is temporarily unreachable.
