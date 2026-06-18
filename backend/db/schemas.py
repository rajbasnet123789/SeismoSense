from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# -----------------
# User Schemas
# -----------------

class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone_number: Optional[str] = Field(None, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------
# StreamData Schemas
# -----------------

class StreamDataBase(BaseModel):
    station: str = Field(..., min_length=1, max_length=50)
    p_wave: float = Field(..., description="P-wave prediction probability")

class StreamDataCreate(StreamDataBase):
    pass

class StreamDataResponse(StreamDataBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------
# Auth Schemas
# -----------------

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# -----------------
# Station Schemas
# -----------------

class StationResponse(BaseModel):
    code: str
    network: str = "IU"
    location: str = ""
    lat: float = 0.0
    lon: float = 0.0
    status: str = "online"
    rate: float = 0.0
    lag: str = "—"
    last_seen: str = "—"
    pkts: float = 0.0
    events: int = 0

    class Config:
        from_attributes = True


# -----------------
# Alert Schemas
# -----------------

class AlertResponse(BaseModel):
    id: str
    sev: str
    type: str
    station: str
    msg: str
    ts: str
    ack: bool = False

