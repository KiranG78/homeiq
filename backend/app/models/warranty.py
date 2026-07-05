from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Warranty(Base):
    __tablename__ = "warranties"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    appliance_id        = Column(Integer, ForeignKey("appliances.id", ondelete="CASCADE"), nullable=False)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    warranty_type       = Column(String(50), default="manufacturer")
    start_date          = Column(Date)
    expiry_date         = Column(Date, nullable=False)
    coverage_summary    = Column(Text)
    what_is_covered     = Column(Text)
    what_is_not_covered = Column(Text)
    claim_phone         = Column(String(20))
    claim_url           = Column(Text)
    claim_email         = Column(String(255))
    provider_name       = Column(String(255))
    notes               = Column(Text)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    appliance = relationship("Appliance", back_populates="warranty")
