from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    specialty = Column(String(100), nullable=False)
    rating = Column(Float, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    zip_code = Column(String(20), nullable=True)
    rate_per_hour = Column(Float, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
