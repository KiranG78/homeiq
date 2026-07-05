from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import date

from app.models.appliance import Appliance
from app.models.warranty import Warranty
from app.schemas.appliance import ApplianceCreate, ApplianceUpdate

class ApplianceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _enrich_appliance(self, appliance: Appliance):
        # Calculate age
        if appliance.purchase_date:
            delta = date.today() - appliance.purchase_date
            appliance.age_years = round(delta.days / 365.25, 1)
        else:
            appliance.age_years = None

        # Calculate warranty status
        if hasattr(appliance, 'warranty') and appliance.warranty:
            days_left = (appliance.warranty.expiry_date - date.today()).days
            appliance.warranty.days_remaining = days_left
            if days_left < 0:
                appliance.warranty.warranty_status = "expired"
            elif days_left <= 90:
                appliance.warranty.warranty_status = "expiring_soon"
            else:
                appliance.warranty.warranty_status = "active"

        return appliance

    async def get_all_appliances(self, user_id: int):
        stmt = select(Appliance).where(Appliance.user_id == user_id).options(selectinload(Appliance.warranty))
        result = await self.db.execute(stmt)
        appliances = result.scalars().all()
        return [self._enrich_appliance(a) for a in appliances]

    async def get_appliance(self, appliance_id: int):
        stmt = select(Appliance).where(Appliance.id == appliance_id).options(selectinload(Appliance.warranty))
        result = await self.db.execute(stmt)
        appliance = result.scalars().first()
        if appliance:
            return self._enrich_appliance(appliance)
        return None

    async def create_appliance(self, user_id: int, data: ApplianceCreate):
        # Extract warranty data
        warranty_data = data.warranty
        
        # Create appliance
        app_dict = data.model_dump(exclude={"warranty"}, exclude_unset=True)
        db_appliance = Appliance(**app_dict, user_id=user_id)
        self.db.add(db_appliance)
        await self.db.flush() # To get the ID

        # Create warranty if present
        if warranty_data:
            warr_dict = warranty_data.model_dump(exclude_unset=True)
            db_warranty = Warranty(**warr_dict, appliance_id=db_appliance.id, user_id=user_id)
            self.db.add(db_warranty)
            db_appliance.warranty = db_warranty

        await self.db.commit()
        await self.db.refresh(db_appliance)
        
        # Ensure warranty is loaded
        return await self.get_appliance(db_appliance.id)

    async def update_appliance(self, appliance_id: int, data: ApplianceUpdate):
        db_appliance = await self.get_appliance(appliance_id)
        if not db_appliance:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_appliance, key, value)
            
        await self.db.commit()
        return await self.get_appliance(appliance_id)

    async def delete_appliance(self, appliance_id: int):
        stmt = select(Appliance).where(Appliance.id == appliance_id)
        result = await self.db.execute(stmt)
        appliance = result.scalars().first()
        if appliance:
            await self.db.delete(appliance)
            await self.db.commit()
            return True
        return False
