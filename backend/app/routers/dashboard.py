from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import date
from dateutil.relativedelta import relativedelta
from app.database import get_db
from app.models.appliance import Appliance
from app.models.bill import Bill

router = APIRouter()

@router.get("/insights")
async def get_dashboard_insights(db: AsyncSession = Depends(get_db)):
    user_id = 1
    result = await db.execute(select(Appliance).where(Appliance.user_id == user_id))
    appliances = result.scalars().all()
    
    insights = []
    today = date.today()
    
    for app in appliances:
        if app.purchase_date and app.expected_lifespan_years:
            # Check critical failure
            expected_failure_date = app.purchase_date + relativedelta(years=int(app.expected_lifespan_years))
            months_to_failure = (expected_failure_date.year - today.year) * 12 + expected_failure_date.month - today.month
            
            if 0 < months_to_failure <= 12:
                budget = app.purchase_price if app.purchase_price else 500
                insights.append({
                    "type": "Critical",
                    "title": f"Critical: {app.name}",
                    "description": f"Expected to fail in ~{months_to_failure} months. Start budgeting ${budget} now.",
                    "color": "orange",
                    "appliance_id": app.id
                })
            elif months_to_failure <= 0:
                insights.append({
                    "type": "Critical",
                    "title": f"Critical: {app.name}",
                    "description": f"Past expected lifespan. Monitor closely.",
                    "color": "red",
                    "appliance_id": app.id
                })
        
        if app.estimated_annual_energy_cost and app.estimated_annual_energy_cost > 100:
            insights.append({
                "type": "Insight",
                "title": f"Insight: {app.name} ROI",
                "description": f"Your {app.name} costs ${app.estimated_annual_energy_cost}/yr in electricity. Upgrading may pay for itself.",
                "color": "primary",
                "appliance_id": app.id
            })
            
    # Limit to 3 insights for dashboard
    return insights[:3]

@router.get("/energy-trend")
async def get_energy_trend(db: AsyncSession = Depends(get_db)):
    user_id = 1
    # Get bills from the last 12 months
    today = date.today()
    twelve_months_ago = today - relativedelta(months=11)
    # We'll just fetch all bills and sort them
    result = await db.execute(select(Bill).where(Bill.user_id == user_id))
    bills = result.scalars().all()
    
    # Filter for last 12 months and group by month name
    trend_data = {}
    for i in range(12):
        d = today - relativedelta(months=i)
        trend_data[f"{d.year}-{d.month:02d}"] = {
            "name": d.strftime("%b"),
            "cost": 0,
            "date_sort": d
        }
        
    for bill in bills:
        if bill.due_date:
            key = f"{bill.due_date.year}-{bill.due_date.month:02d}"
            if key in trend_data:
                trend_data[key]["cost"] += bill.amount
                
    # Sort chronologically
    sorted_keys = sorted(trend_data.keys(), key=lambda k: trend_data[k]["date_sort"])
    
    final_data = []
    for k in sorted_keys:
        final_data.append({
            "name": trend_data[k]["name"],
            "cost": round(trend_data[k]["cost"], 2)
        })
        
    return final_data
