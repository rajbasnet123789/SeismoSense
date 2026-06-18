import logging
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
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

# Configure logging
logger = logging.getLogger("backend.main")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Password hashing configuration (uses Argon2 internally as specified in pyproject.toml)
password_hash = PasswordHash.recommended()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database initialization and create tables on startup
    logger.info("Starting up and initializing database...")
    try:
        init_db()
        logger.info("Startup database initialization completed.")
    except Exception as e:
        logger.error(f"Startup database initialization failed: {e}")
    yield
    logger.info("Shutting down backend app...")

app = FastAPI(
    title="SeismoSense API",
    description="Real-time earthquake monitoring and predictive analytics backend",
    version="1.0.0",
    lifespan=lifespan
)

# Allow CORS from the Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Check API status and database connectivity.
    """
    db_ok = check_connection()
    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )
    return {"status": "healthy", "database": "connected"}

@app.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user, hash the password, and save to database.
    """
    # Check if email is already registered
    existing_user = db.query(model.User).filter(model.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    try:
        # Hash the plain-text password using Argon2
        hashed_password = password_hash.hash(user.password)
        
        # Instantiate SQLAlchemy User model
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
    """
    Authenticate a user and return a JWT access token.
    Supports standard OAuth2 password flow (compatible with FastAPI Swagger UI).
    """
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
    """
    Retrieve the authenticated user's profile details.
    """
    return current_user

@app.get("/predictions", response_model=List[StreamDataResponse])
def read_predictions(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """
    Retrieve recent stream predictions saved from the sensor Kafka consumers.
    """
    predictions = db.query(model.StreamData).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/predictions/station/{station}", response_model=List[StreamDataResponse])
def read_predictions_by_station(station: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """
    Retrieve stream predictions for a specific seismic sensor station.
    """
    predictions = db.query(model.StreamData).filter(model.StreamData.station == station).order_by(model.StreamData.id.desc()).offset(offset).limit(limit).all()
    return predictions

@app.get("/stations", response_model=List[StationResponse])
def read_stations(db: Session = Depends(get_db)):
    """
    Retrieve all seismic stations with aggregate stats from stream data.
    """
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
    """
    Retrieve recent high-probability seismic events as alerts.
    """
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
