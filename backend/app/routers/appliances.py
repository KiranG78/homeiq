from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.schemas.appliance import ApplianceCreate, ApplianceUpdate, ApplianceResponse
from app.services.appliance_service import ApplianceService

router = APIRouter()

@router.get("/", response_model=List[ApplianceResponse])
async def list_appliances(db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    return await service.get_all_appliances(user_id=1)  # hardcoded user 1 for Phase 1

@router.post("/", response_model=ApplianceResponse, status_code=201)
async def create_appliance(data: ApplianceCreate, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    return await service.create_appliance(user_id=1, data=data)

@router.get("/{appliance_id}", response_model=ApplianceResponse)
async def get_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    appliance = await service.get_appliance(appliance_id)
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    return appliance

@router.put("/{appliance_id}", response_model=ApplianceResponse)
async def update_appliance(appliance_id: int, data: ApplianceUpdate, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    appliance = await service.update_appliance(appliance_id, data)
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    return appliance

@router.delete("/{appliance_id}", status_code=204)
async def delete_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    deleted = await service.delete_appliance(appliance_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Appliance not found")

