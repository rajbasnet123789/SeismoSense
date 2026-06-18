import logging
from sqlalchemy import text
from backend.db.base import Base, engine, SessionLocal

# Set up logger
logger = logging.getLogger("backend.db.connection")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

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
