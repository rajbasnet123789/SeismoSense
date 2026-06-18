from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from backend.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, nullable=True)  # Saved as string to avoid overflow and preserve format
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


class StreamData(Base):
    __tablename__ = "stream_data"

    id = Column(Integer, primary_key=True, index=True)
    station = Column(String, index=True, nullable=False)
    p_wave = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<StreamData id={self.id} station={self.station} p_wave={self.p_wave}>"
