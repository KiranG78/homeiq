from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

SQLITE_URL = "sqlite+aiosqlite:///../homeiq.db"

engine = create_async_engine(SQLITE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def init_db():
    from app.models import Contractor, User, Appliance, Bill, Document
    from sqlalchemy import select, update

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        # Check and Create User Ninja Hathodi
        result_user = await session.execute(select(User).where(User.full_name == "Ninja Hathodi"))
        user = result_user.scalars().first()
        if not user:
            user = User(
                full_name="Ninja Hathodi",
                email="ninja@homeiq.com",
                address="123 Ninja Way",
                zip_code="90210",
                city="Los Angeles",
                state="CA"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            # Link existing records to the new user if they have user_id=1 (or if they are unlinked, though user_id is non-nullable)
            await session.execute(update(Appliance).where(Appliance.user_id == 1).values(user_id=user.id))
            await session.execute(update(Bill).where(Bill.user_id == 1).values(user_id=user.id))
            await session.execute(update(Document).where(Document.user_id == 1).values(user_id=user.id))
            await session.commit()

        # Check and Create Contractors
        result = await session.execute(select(Contractor))
        if not result.scalars().first():
            mock_contractors = [
                Contractor(name="Joe's HVAC Repair", phone="555-0101", rating=4.8, specialty="HVAC", rate_per_hour=85.0),
                Contractor(name="Elite Appliance Fixers", phone="555-0202", rating=4.5, specialty="Refrigerator", rate_per_hour=95.0),
                Contractor(name="Quick Water Heaters", phone="555-0303", rating=4.9, specialty="Water Heater", rate_per_hour=110.0),
                Contractor(name="General Handyman Dan", phone="555-0404", rating=4.2, specialty="General", rate_per_hour=60.0),
            ]
            session.add_all(mock_contractors)
            await session.commit()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
