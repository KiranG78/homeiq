from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    address: Optional[str] = None
    zip_code: str
    city: Optional[str] = None
    state: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: Optional[str]
    address: Optional[str]
    zip_code: str
    city: Optional[str]
    state: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
