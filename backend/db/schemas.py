from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List


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



class StreamDataBase(BaseModel):
    station: str = Field(..., min_length=1, max_length=50)
    p_wave: float = Field(..., description="P-wave prediction probability")

class StreamDataCreate(StreamDataBase):
    z_samples: Optional[str] = None
    n_samples: Optional[str] = None
    e_samples: Optional[str] = None

class StreamDataResponse(StreamDataBase):
    id: int
    z_samples: Optional[str] = None
    n_samples: Optional[str] = None
    e_samples: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True



class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str




class StationResponse(BaseModel):
    code: str
    network: str = "IU"
    location: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    status: str = "online"
    rate: Optional[float] = None
    lag: Optional[str] = None
    last_seen: str = "—"
    pkts: Optional[float] = None
    events: int = 0

    class Config:
        from_attributes = True



class AlertResponse(BaseModel):
    id: str
    sev: str
    type: str
    station: str
    msg: str
    ts: str
    ack: bool = False

