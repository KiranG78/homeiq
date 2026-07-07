import asyncio
from app.database import AsyncSessionLocal
from app.models import Appliance, Bill
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        apps = (await session.execute(select(Appliance))).scalars().all()
        bills = (await session.execute(select(Bill))).scalars().all()
        print('Appliances:', len(apps))
        print('Bills:', len(bills))

asyncio.run(main())
