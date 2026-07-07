from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import uuid

from app.database import get_db
from app.schemas.bill import BillCreate, BillResponse, BillUpdate
from app.services.bill_service import BillService
from app.services.extraction import extract_bill_data

router = APIRouter()

@router.get("/", response_model=List[BillResponse])
async def list_bills(db: AsyncSession = Depends(get_db)):
    service = BillService(db)
    return await service.get_all_bills(user_id=1)  # hardcoded user 1 for Phase 2

@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(bill_id: int, db: AsyncSession = Depends(get_db)):
    service = BillService(db)
    bill = await service.get_bill(bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@router.post("/upload", response_model=BillResponse, status_code=201)
async def upload_bill(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # Save the file
    file_bytes = await file.read()
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join("uploads", unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)

    # Call Gemini to extract bill data
    extracted_data = await extract_bill_data(file_bytes)
    
    # Create Bill in DB
    service = BillService(db)
    bill_data = BillCreate(**extracted_data, image_path=file_path)
    return await service.create_bill(user_id=1, data=bill_data)

@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(bill_id: int, data: BillUpdate, db: AsyncSession = Depends(get_db)):
    service = BillService(db)
    bill = await service.update_bill(bill_id, data)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@router.delete("/{bill_id}", status_code=204)
async def delete_bill(bill_id: int, db: AsyncSession = Depends(get_db)):
    service = BillService(db)
    deleted = await service.delete_bill(bill_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bill not found")
