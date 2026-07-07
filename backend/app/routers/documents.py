from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse
from datetime import datetime
import os
from app.core.config import settings
from app.services.extraction import extract_from_invoice_image

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.user_id == 1))
    return result.scalars().all()

@router.get("/active-returns", response_model=List[DocumentResponse])
async def list_active_returns(db: AsyncSession = Depends(get_db)):
    from datetime import date
    today = date.today()
    result = await db.execute(
        select(Document)
        .where(Document.user_id == 1)
        .where(Document.return_expiration_date >= today)
    )
    return result.scalars().all()

@router.post("/extract")
async def extract_document_details(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are supported")
    
    image_bytes = await file.read()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"extract_{timestamp}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
        
    image_path = f"/uploads/{filename}"
    
    extracted = await extract_from_invoice_image(image_bytes)
    
    return {
        "extracted": extracted,
        "image_path": image_path
    }
