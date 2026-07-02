import logging
from sqlalchemy import text, inspect
from backend.db.base import Base, engine, SessionLocal

# Set up logger
logger = logging.getLogger("backend.db.connection")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def _add_missing_columns():
    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("stream_data")}
    target_cols = {"z_samples", "n_samples", "e_samples"}
    missing = target_cols - existing_cols
    if not missing:
        return
    with engine.connect() as conn:
        for col in missing:
            logger.info(f"Adding missing column stream_data.{col}")
            conn.execute(text(f"ALTER TABLE stream_data ADD COLUMN {col} TEXT"))
        conn.commit()


def init_db():
    """
    Initializes the database by creating all tables defined in the SQLAlchemy models.
    """
    try:
        # Import models to register them with SQLAlchemy Base metadata
        from backend.db import model
        
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        _add_missing_columns()
        logger.info("Database migration complete (missing columns added).")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise e

def check_connection():
    """
    Verifies connection to the database by executing a lightweight query.
    Returns:
        bool: True if connection is successful, False otherwise.
    """
    db = SessionLocal()
    try:
        logger.info("Testing database connection...")
        db.execute(text("SELECT 1"))
        logger.info("Database connection test succeeded.")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
    finally:
        db.close()
