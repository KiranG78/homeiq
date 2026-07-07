from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class DocumentCreate(BaseModel):
    document_type: str
    title: Optional[str] = None
    store_name: Optional[str] = None
    total_amount: Optional[float] = None
    purchase_date: Optional[date] = None
    return_expiration_date: Optional[date] = None
    extracted_text: Optional[str] = None
    extracted_json: Optional[str] = None
    image_path: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    store_name: Optional[str] = None
    total_amount: Optional[float] = None
    purchase_date: Optional[date] = None
    return_expiration_date: Optional[date] = None

class DocumentResponse(DocumentCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
