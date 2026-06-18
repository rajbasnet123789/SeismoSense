
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from .env file
load_dotenv()

# Get database URL with fallback to the Aiven PostgreSQL URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/seismosense"
)

# Convert standard postgresql:// scheme to postgresql+psycopg:// for psycopg 3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create SQLAlchemy engine with connection pool pre-pinging to avoid stale connection errors
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

# DB session generator helper
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

