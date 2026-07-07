import asyncio
import random
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from app.database import AsyncSessionLocal
from app.models.appliance import Appliance
from app.models.bill import Bill
from sqlalchemy import select

async def generate_data():
    async with AsyncSessionLocal() as session:
        # Update appliances
        result = await session.execute(select(Appliance))
        appliances = result.scalars().all()
        
        for app in appliances:
            if not app.expected_lifespan_years:
                if app.category in ['refrigerator', 'washer', 'dryer', 'dishwasher']:
                    app.expected_lifespan_years = 12.0
                elif app.category in ['hvac', 'furnace', 'ac']:
                    app.expected_lifespan_years = 15.0
                elif app.category in ['water_heater']:
                    app.expected_lifespan_years = 10.0
                else:
                    app.expected_lifespan_years = 10.0
            
            if not app.estimated_annual_energy_cost:
                if app.category == 'refrigerator':
                    app.estimated_annual_energy_cost = 150.0
                elif app.category == 'hvac':
                    app.estimated_annual_energy_cost = 400.0
                elif app.category == 'water_heater':
                    app.estimated_annual_energy_cost = 250.0
                else:
                    app.estimated_annual_energy_cost = 50.0
            
            session.add(app)
            
        # Ensure we have a user (we'll just use user_id = 1)
        user_id = 1
        
        # Check if we already have bills, if so delete them so we can regenerate a clean 12-month set
        existing_bills = await session.execute(select(Bill).where(Bill.user_id == user_id))
        for b in existing_bills.scalars().all():
            if b.provider == "PowerCo (Generated)":
                await session.delete(b)
                
        # Generate 12 months of bills
        today = date.today()
        # Start from the 1st of the current month
        current_month = date(today.year, today.month, 1)
        
        for i in range(12):
            bill_date = current_month - relativedelta(months=i)
            # Add some seasonality to cost: higher in summer (months 6-8) and winter (months 12, 1, 2)
            base_cost = random.uniform(90, 130)
            if bill_date.month in [6, 7, 8]:
                base_cost += random.uniform(40, 70)
            elif bill_date.month in [12, 1, 2]:
                base_cost += random.uniform(20, 50)
                
            bill = Bill(
                user_id=user_id,
                provider="PowerCo (Generated)",
                amount=round(base_cost, 2),
                due_date=bill_date,
                billing_period=bill_date.strftime("%B %Y")
            )
            session.add(bill)
            
        await session.commit()
        print("Data generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate_data())
