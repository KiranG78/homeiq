from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appliance_id = Column(Integer, ForeignKey("appliances.id"), nullable=False)
    task_name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending") # pending, completed
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    appliance = relationship("Appliance", back_populates="maintenance_tasks")
