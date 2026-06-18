import logging
import os
import threading
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from pwdlib import PasswordHash

from backend.db.base import get_db
from backend.db.connection import init_db, check_connection
from backend.db.schemas import (
    UserCreate, UserResponse, Token, StreamDataResponse,
    StreamDataCreate, StationResponse, AlertResponse
)
from backend.db import model
from backend.auth import create_access_token, get_current_user

logger = logging.getLogger("backend.main")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

password_hash = PasswordHash.recommended()

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "out"

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up and initializing database...")
    try:
        init_db()
        logger.info("Startup database initialization completed.")
    except Exception as e:
        logger.error(f"Startup database initialization failed: {e}")

    def _run_producer():
        try:
            from backend.kafka.producer import fetch_and_send
            logger.info("Kafka producer thread starting...")
            fetch_and_send()
        except Exception as e:
            logger.error(f"Kafka producer failed: {e}")

    def _run_consumer():
        try:
            from backend.kafka.consumer import consume
            logger.info("Kafka consumer thread starting...")
            consume()
        except Exception as e:
            logger.error(f"Kafka consumer failed: {e}")

    producer_thread = threading.Thread(target=_run_producer, daemon=True, name="kafka-producer")
    consumer_thread = threading.Thread(target=_run_consumer, daemon=True, name="kafka-consumer")
    producer_thread.start()
    consumer_thread.start()
    logger.info("Kafka producer and consumer threads launched.")

    yield

    logger.info("Shutting down backend app...")

app = FastAPI(
    title="SeismoSense API",
    description="Real-time earthquake monitoring and predictive analytics backend",
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
def health_check():
    db_ok = check_connection()
    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )
    return {"status": "healthy", "database": "connected"}

@app.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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
def read_users_me(current_user: model.User = Depends(get_current_user)):
    return current_user

@app.get("/predictions", response_model=List[StreamDataResponse])
def read_predictions(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    predictions = db.query(model.StreamData).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/predictions/station/{station}", response_model=List[StreamDataResponse])
def read_predictions_by_station(station: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    predictions = db.query(model.StreamData).filter(model.StreamData.station == station).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/stations", response_model=List[StationResponse])
def read_stations(db: Session = Depends(get_db)):
    station_codes = db.query(model.StreamData.station).distinct().all()
    stations = []
    for (code,) in station_codes:
        stats = db.query(
            func.count(model.StreamData.id),
            func.avg(model.StreamData.p_wave),
            func.max(model.StreamData.created_at)
        ).filter(model.StreamData.station == code).first()
        count, avg_pwave, last_seen = stats
        event_count = db.query(model.StreamData.id).filter(
            model.StreamData.station == code,
            model.StreamData.p_wave > 0.5
        ).count()
        parts = code.split(".")
        s_code = parts[0] if len(parts) > 1 else code
        s_net = parts[1] if len(parts) > 1 else "IU"
        last_str = last_seen.strftime("%H:%M:%S") if last_seen else "—"
        stations.append(StationResponse(
            code=s_code,
            network=s_net,
            location=None,
            lat=None,
            lon=None,
            status="online" if last_seen and (datetime.now(timezone.utc) - last_seen).total_seconds() < 3600 else "offline",
            rate=None,
            lag=None,
            last_seen=last_str,
            pkts=None,
            events=event_count,
        ))
    return stations

@app.get("/alerts", response_model=List[AlertResponse])
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

# ── Frontend Static Files ───────────────────────────────────

if FRONTEND_DIR.is_dir():
    app.mount("/_next/static", StaticFiles(directory=str(FRONTEND_DIR / "_next" / "static")), name="next-static")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
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
            "message": "SeismoSense API is running",
            "docs": "/docs",
            "health": "/health"
        }
