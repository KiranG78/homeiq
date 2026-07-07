from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    document_type = Column(String(50), nullable=False) # 'receipt', 'grocery', 'home_doc', 'utility_bill'
    title = Column(String(255))
    store_name = Column(String(255))
    total_amount = Column(Float)
    purchase_date = Column(Date)
    return_expiration_date = Column(Date)
    
    extracted_text = Column(Text)
    extracted_json = Column(Text)
    image_path = Column(String(500))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="documents")
