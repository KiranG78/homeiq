from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from enum import Enum

class ApplianceCategory(str, Enum):
    hvac          = "hvac"
    refrigerator  = "refrigerator"
    dishwasher    = "dishwasher"
    washer        = "washer"
    dryer         = "dryer"
    oven          = "oven"
    water_heater  = "water_heater"
    other         = "other"

class WarrantyStatus(str, Enum):
    active          = "active"
    expiring_soon   = "expiring_soon"
    expired         = "expired"
    no_warranty     = "no_warranty"

class WarrantyCreate(BaseModel):
    warranty_type:       Optional[str] = "manufacturer"
    start_date:          Optional[date] = None
    expiry_date:         date
    coverage_summary:    Optional[str] = None
    what_is_covered:     Optional[str] = None
    what_is_not_covered: Optional[str] = None
    claim_phone:         Optional[str] = None
    claim_url:           Optional[str] = None
    claim_email:         Optional[str] = None
    provider_name:       Optional[str] = None
    notes:               Optional[str] = None

class WarrantyResponse(WarrantyCreate):
    id:               int
    appliance_id:     int
    warranty_status:  WarrantyStatus
    days_remaining:   Optional[int] = None

class ApplianceCreate(BaseModel):
    name:               str
    category:           ApplianceCategory
    brand:              Optional[str] = None
    model_number:       Optional[str] = None
    serial_number:      Optional[str] = None
    purchase_date:      Optional[date] = None
    purchase_price:     Optional[float] = None
    purchase_retailer:  Optional[str] = None
    location:           Optional[str] = None
    notes:              Optional[str] = None
    warranty:           Optional[WarrantyCreate] = None  # included in same request

class ApplianceUpdate(BaseModel):
    name:              Optional[str] = None
    brand:             Optional[str] = None
    model_number:      Optional[str] = None
    serial_number:     Optional[str] = None
    purchase_date:     Optional[date] = None
    purchase_price:    Optional[float] = None
    purchase_retailer: Optional[str] = None
    location:          Optional[str] = None
    notes:             Optional[str] = None

class ApplianceResponse(BaseModel):
    id:                int
    name:              str
    category:          str
    brand:             Optional[str]
    model_number:      Optional[str]
    serial_number:     Optional[str]
    purchase_date:     Optional[date]
    purchase_price:    Optional[float]
    purchase_retailer: Optional[str]
    location:          Optional[str]
    notes:             Optional[str]
    age_years:         Optional[float] = None
    warranty:          Optional[WarrantyResponse] = None
    created_at:        datetime

    class Config:
        from_attributes = True
