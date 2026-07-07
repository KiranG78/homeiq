from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional

class BillBase(BaseModel):
    provider: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    billing_period: Optional[str] = None
    image_path: Optional[str] = None
    extracted_json: Optional[str] = None

class BillCreate(BillBase):
    pass

class BillUpdate(BillBase):
    pass

class BillResponse(BillBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
