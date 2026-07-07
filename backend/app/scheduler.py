from apscheduler.schedulers.asyncio import AsyncIOScheduler
from loguru import logger
from datetime import datetime, timedelta
import asyncio

from app.database import AsyncSessionLocal
from app.models.appliance import Appliance
from app.models.maintenance_task import MaintenanceTask
from sqlalchemy import select

scheduler = AsyncIOScheduler()

async def generate_routine_maintenance():
    logger.info("Running routine maintenance check...")
    async with AsyncSessionLocal() as session:
        # Get all appliances
        result = await session.execute(select(Appliance))
        appliances = result.scalars().all()
        
        for appliance in appliances:
            if appliance.category.lower() == "hvac":
                # Check if there is an open HVAC maintenance task
                task_result = await session.execute(
                    select(MaintenanceTask).where(
                        MaintenanceTask.appliance_id == appliance.id,
                        MaintenanceTask.status == "pending",
                        MaintenanceTask.task_name == "HVAC Filter Replacement"
                    )
                )
                if not task_result.scalars().first():
                    new_task = MaintenanceTask(
                        appliance_id=appliance.id,
                        task_name="HVAC Filter Replacement",
                        description="Replace the air filter to maintain efficiency and air quality.",
                        due_date=datetime.utcnow() + timedelta(days=90),
                        status="pending"
                    )
                    session.add(new_task)
                    
            elif appliance.category.lower() == "refrigerator":
                task_result = await session.execute(
                    select(MaintenanceTask).where(
                        MaintenanceTask.appliance_id == appliance.id,
                        MaintenanceTask.status == "pending",
                        MaintenanceTask.task_name == "Clean Condenser Coils"
                    )
                )
                if not task_result.scalars().first():
                    new_task = MaintenanceTask(
                        appliance_id=appliance.id,
                        task_name="Clean Condenser Coils",
                        description="Vacuum the condenser coils to prevent overheating.",
                        due_date=datetime.utcnow() + timedelta(days=180),
                        status="pending"
                    )
                    session.add(new_task)
        
        await session.commit()
    logger.info("Maintenance check complete.")

def init_scheduler():
    # Run every day (for demo purposes, maybe every minute so it generates tasks instantly)
    scheduler.add_job(generate_routine_maintenance, 'interval', minutes=1, id="maintenance_job", replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started.")
