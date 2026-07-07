from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Appliance(Base):
    __tablename__ = "appliances"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    user_id            = Column(Integer, ForeignKey("users.id"), nullable=False)
    name               = Column(String(255), nullable=False)
    category           = Column(String(100), nullable=False)
    brand              = Column(String(100))
    model_number       = Column(String(255))
    serial_number      = Column(String(255))
    purchase_date      = Column(Date)
    purchase_price     = Column(Float)
    purchase_retailer  = Column(String(255))
    location           = Column(String(100))
    notes              = Column(Text)
    invoice_image_path = Column(Text)
    extracted_raw_text = Column(Text)
    extracted_json     = Column(Text)
    expected_lifespan_years = Column(Float)
    estimated_annual_energy_cost = Column(Float)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())

    warranty = relationship("Warranty", back_populates="appliance",
                            uselist=False, cascade="all, delete-orphan")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="appliance", cascade="all, delete-orphan")
    user     = relationship("User", back_populates="appliances")
