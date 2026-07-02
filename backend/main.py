import logging
import os
import threading
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
import json
from fastapi import FastAPI, Depends, HTTPException, Request, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from pwdlib import PasswordHash
import sys
# Add parent directory of backend to sys.path to support running directly
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.db.base import get_db
from backend.db.connection import init_db, check_connection
from backend.db.schemas import (
    UserCreate, UserResponse, Token, StreamDataResponse,
    StreamDataCreate, StationResponse, AlertResponse
)
from backend.db import model
from backend.auth import create_access_token, get_current_user
from backend.ws_manager import manager
from backend.stations_config import KNOWN_STATIONS, STATION_CODES

logger = logging.getLogger("backend.main")

KAFKA_PIPELINE_ENABLED = os.getenv("ENABLE_KAFKA_PIPELINE", "true").lower() != "false"
KAFKA_BASE_DIR = Path(__file__).resolve().parent / "kafka_integration"
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

password_hash = PasswordHash.recommended()

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "out"


def _kafka_certs_available() -> bool:
    ca = os.getenv("KAFKA_SSL_CAFILE", str(KAFKA_BASE_DIR / "ca.pem"))
    cert = os.getenv("KAFKA_SSL_CERTFILE", str(KAFKA_BASE_DIR / "service.cert"))
    key = os.getenv("KAFKA_SSL_KEYFILE", str(KAFKA_BASE_DIR / "service.key"))
    return all(Path(p).is_file() for p in (ca, cert, key))


def _start_kafka_pipeline(stop_event: threading.Event):
    """Start producer and consumer in background threads (same process as API)."""
    def run_producer():
        try:
            from backend.kafka_integration.producer import fetch_and_send
            fetch_and_send(stop_event)
        except Exception as e:
            logger.error(f"Kafka producer thread exited: {e}")

    def run_consumer():
        try:
            from backend.kafka_integration.consumer import consume
            consume(stop_event)
        except Exception as e:
            logger.error(f"Kafka consumer thread exited: {e}")

    threading.Thread(target=run_producer, daemon=True, name="kafka-producer").start()
    threading.Thread(target=run_consumer, daemon=True, name="kafka-consumer").start()
    logger.info("Kafka producer and consumer threads started.")


def _station_status(last_seen: Optional[datetime]) -> str:
    if not last_seen:
        return "offline"
    age = (datetime.utcnow() - last_seen.replace(tzinfo=None)).total_seconds()
    if age <= 15:
        return "online"
    if age <= 60:
        return "degraded"
    return "offline"


def _format_lag(last_seen: Optional[datetime]) -> Optional[str]:
    if not last_seen:
        return None
    age = int((datetime.utcnow() - last_seen.replace(tzinfo=None)).total_seconds())
    if age < 60:
        return f"{age}s"
    return f"{age // 60}m"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up and initializing database...")
    manager.set_loop(asyncio.get_event_loop())
    kafka_stop = threading.Event()
    app.state.kafka_stop = kafka_stop

    try:
        init_db()
        logger.info("Startup database initialization completed.")
    except Exception as e:
        logger.error(f"Startup database initialization failed: {e}")

    if KAFKA_PIPELINE_ENABLED and _kafka_certs_available():
        _start_kafka_pipeline(kafka_stop)
    elif KAFKA_PIPELINE_ENABLED:
        logger.warning("Kafka SSL certs not found — pipeline not started. Place certs in backend/kafka_integration/")

    yield

    kafka_stop.set()
    logger.info("Shutting down backend app...")


app = FastAPI(
    title="SeismoSense API - SHL Station",
    description="Real-time seismic monitoring - Shillong (SHL), India single-station backend",
    version="1.0.0",
    lifespan=lifespan
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ──────────────────────────────────────────────

@app.get("/health", status_code=status.HTTP_200_OK)
@app.get("/health/", status_code=status.HTTP_200_OK)
def health_check():
    db_ok = check_connection()
    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )
    return {"status": "healthy", "database": "connected"}

@app.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@app.post("/signup/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(model.User).filter(model.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    try:
        hashed_password = password_hash.hash(user.password)
        db_user = model.User(
            name=user.name,
            email=user.email,
            phone_number=user.phone_number,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User {db_user.email} registered successfully.")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user due to an internal error"
        )

@app.post("/login", response_model=Token)
@app.post("/login/", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(model.User).filter(model.User.email == form_data.username).first()
    if not user or not password_hash.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    logger.info(f"User {user.email} authenticated and logged in.")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
@app.get("/users/me/", response_model=UserResponse)
def read_users_me(current_user: model.User = Depends(get_current_user)):
    return current_user

@app.get("/predictions", response_model=List[StreamDataResponse])
@app.get("/predictions/", response_model=List[StreamDataResponse])
def read_predictions(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    predictions = db.query(model.StreamData).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/predictions/station/{station}", response_model=List[StreamDataResponse])
@app.get("/predictions/station/{station}/", response_model=List[StreamDataResponse])
def read_predictions_by_station(station: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    predictions = db.query(model.StreamData).filter(model.StreamData.station == station).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/stations", response_model=List[StationResponse])
@app.get("/stations/", response_model=List[StationResponse])
def read_stations(db: Session = Depends(get_db)):
    cutoff = datetime.utcnow()
    recent_cutoff = cutoff - timedelta(seconds=60)

    stats_list = db.query(
        model.StreamData.station,
        func.max(model.StreamData.created_at).label("last_seen"),
        func.sum(case((model.StreamData.p_wave > 0.5, 1), else_=0)).label("event_count"),
        func.sum(case((model.StreamData.created_at >= recent_cutoff, 1), else_=0)).label("recent_count"),
    ).group_by(model.StreamData.station).all()

    stats_by_code = {}
    for station_code, last_seen, event_count, recent_count in stats_list:
        if not station_code:
            continue
        code = station_code.split(".")[0]
        stats_by_code[code] = {
            "last_seen": last_seen,
            "event_count": int(event_count or 0),
            "recent_count": int(recent_count or 0),
        }

    stations = []
    for meta in KNOWN_STATIONS:
        code = meta["code"]
        stats = stats_by_code.get(code, {})
        last_seen = stats.get("last_seen")
        recent_count = stats.get("recent_count", 0)
        pkts = min(100.0, round(recent_count / 60.0 * 100, 1)) if recent_count else 0.0
        stations.append(StationResponse(
            code=code,
            network=meta["network"],
            location=meta["location"],
            lat=meta["lat"],
            lon=meta["lon"],
            status=_station_status(last_seen),
            rate=meta["rate"] if last_seen else None,
            lag=_format_lag(last_seen),
            last_seen=last_seen.strftime("%H:%M:%S") if last_seen else "—",
            pkts=pkts if last_seen else 0.0,
            events=stats.get("event_count", 0),
        ))

    status_order = {"online": 0, "degraded": 1, "offline": 2}
    stations.sort(key=lambda s: (status_order.get(s.status, 3), s.code))
    return stations

@app.get("/alerts", response_model=List[AlertResponse])
@app.get("/alerts/", response_model=List[AlertResponse])
def read_alerts(limit: int = 20, db: Session = Depends(get_db)):
    high_events = db.query(model.StreamData).filter(
        model.StreamData.p_wave > 0.3
    ).order_by(model.StreamData.id.desc()).limit(limit).all()
    alerts = []
    for i, ev in enumerate(high_events):
        conf_pct = round(ev.p_wave * 100, 1)
        sev = "critical" if conf_pct >= 80 else "high" if conf_pct >= 60 else "medium" if conf_pct >= 40 else "low"
        ev_type = "Seismic Event"
        mag = f"M{round(ev.p_wave * 4, 1)}" if ev.p_wave > 0.5 else "Micro"
        ts = ev.created_at.strftime("%H:%M:%S") if ev.created_at else "—"
        msg = f"{mag} detected — confidence {conf_pct}% — station {ev.station}"
        alerts.append(AlertResponse(
            id=f"ALT-{ev.id:04d}",
            sev=sev,
            type=ev_type,
            station=ev.station,
            msg=msg,
            ts=ts,
            ack=False,
        ))
    return alerts

@app.get("/waveforms/{station}", response_model=dict)
@app.get("/waveforms/{station}/", response_model=dict)
def read_waveforms(station: str, limit: int = 1, db: Session = Depends(get_db)):
    rows = db.query(model.StreamData).filter(
        model.StreamData.station == station,
        model.StreamData.z_samples.isnot(None)
    ).order_by(model.StreamData.id.desc()).limit(limit).all()

    results = []
    for r in rows:
        results.append({
            "id": r.id,
            "station": r.station,
            "p_wave": r.p_wave,
            "z_samples": json.loads(r.z_samples) if r.z_samples else None,
            "n_samples": json.loads(r.n_samples) if r.n_samples else None,
            "e_samples": json.loads(r.e_samples) if r.e_samples else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"station": station, "count": len(results), "waveforms": results}

@app.post("/broadcast", status_code=status.HTTP_200_OK)
@app.post("/broadcast/", status_code=status.HTTP_200_OK)
async def broadcast_event(payload: dict):
    """
    Receives SHL events from the consumer and broadcasts to WebSocket clients.
    """
    await manager.broadcast(payload)
    return {"status": "broadcasted"}

# ── WebSocket ──────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)

# ── Frontend Static Files ───────────────────────────────────

if FRONTEND_DIR.is_dir() and (FRONTEND_DIR / "_next" / "static").is_dir():
    app.mount("/_next/static", StaticFiles(directory=str(FRONTEND_DIR / "_next" / "static")), name="next-static")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # Do not serve frontend static files for API paths
        path_segments = full_path.strip("/").split("/")
        first_segment = path_segments[0] if path_segments else ""
        if first_segment in ["signup", "login", "users", "predictions", "stations", "alerts", "waveforms", "health", "broadcast", "ws"]:
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        index = FRONTEND_DIR / full_path / "index.html"
        if index.is_file():
            return FileResponse(str(index))
        fallback = FRONTEND_DIR / "index.html"
        if fallback.is_file():
            return FileResponse(str(fallback))
        raise HTTPException(status_code=404, detail="Not Found")
else:
    logger.warning(f"Frontend directory not found at {FRONTEND_DIR}, serving API only.")

    @app.get("/", status_code=status.HTTP_200_OK)
    def root():
        return {
            "message": "SeismoSense API (SHL Station) is running",
            "docs": "/docs",
            "health": "/health"
        }
