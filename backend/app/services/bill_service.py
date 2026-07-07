from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.models.bill import Bill
from app.schemas.bill import BillCreate, BillUpdate

class BillService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_bills(self, user_id: int):
        stmt = select(Bill).where(Bill.user_id == user_id).order_by(desc(Bill.due_date))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_bill(self, bill_id: int):
        stmt = select(Bill).where(Bill.id == bill_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_bill(self, user_id: int, data: BillCreate):
        app_dict = data.model_dump(exclude_unset=True)
        db_bill = Bill(**app_dict, user_id=user_id)
        self.db.add(db_bill)
        await self.db.commit()
        await self.db.refresh(db_bill)
        return db_bill

    async def update_bill(self, bill_id: int, data: BillUpdate):
        db_bill = await self.get_bill(bill_id)
        if db_bill:
            update_data = data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_bill, key, value)
            await self.db.commit()
            await self.db.refresh(db_bill)
            return db_bill
        return None

    async def delete_bill(self, bill_id: int):
        db_bill = await self.get_bill(bill_id)
        if db_bill:
            await self.db.delete(db_bill)
            await self.db.commit()
            return True
        return False
