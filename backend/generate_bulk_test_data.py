import asyncio
import random
import shutil
import os
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from app.database import AsyncSessionLocal
from app.models.appliance import Appliance
from app.models.bill import Bill
from app.models.document import Document
from app.models.warranty import Warranty

# Use the images we generated
# C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_appliance_receipt_1783394132831.png
# C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_electricity_bill_1783394143337.png
# C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_insurance_policy_1783394153405.png

RECEIPT_IMG = r"C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_appliance_receipt_1783394132831.png"
BILL_IMG = r"C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_electricity_bill_1783394143337.png"
INSURANCE_IMG = r"C:\Users\shubh\.gemini\antigravity-ide\brain\dc6ef9ee-b446-4293-a18c-f052fa6e69e2\mock_insurance_policy_1783394153405.png"

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Copy to uploads if they exist
dest_receipt = f"/uploads/mock_receipt.png"
dest_bill = f"/uploads/mock_bill.png"
dest_insurance = f"/uploads/mock_insurance.png"

try:
    shutil.copy(RECEIPT_IMG, f".{dest_receipt}")
    shutil.copy(BILL_IMG, f".{dest_bill}")
    shutil.copy(INSURANCE_IMG, f".{dest_insurance}")
except Exception as e:
    print("Warning: could not copy images. They may not exist.", e)


APPLIANCE_TYPES = [
    ("refrigerator", ["LG", "Samsung", "Whirlpool", "GE"], [800, 2500], 12),
    ("washer", ["LG", "Samsung", "Maytag"], [500, 1200], 10),
    ("dryer", ["LG", "Samsung", "Maytag"], [400, 1000], 10),
    ("dishwasher", ["Bosch", "KitchenAid", "Whirlpool"], [400, 1200], 10),
    ("microwave", ["Panasonic", "GE", "Toshiba"], [100, 400], 9),
    ("oven", ["GE", "Frigidaire", "Samsung"], [600, 2000], 15),
    ("hvac", ["Carrier", "Trane", "Lennox"], [3000, 8000], 15),
    ("water_heater", ["Rheem", "A.O. Smith", "Bradford White"], [600, 1500], 10),
    ("tv", ["Sony", "LG", "Samsung"], [300, 3000], 7),
]

DOCUMENT_TYPES = [
    ("receipt", "Home Depot Receipt", dest_receipt),
    ("receipt", "Best Buy Receipt", dest_receipt),
    ("bill", "Electricity Bill", dest_bill),
    ("bill", "Water Bill", dest_bill),
    ("tax_document", "Property Tax Assessment", dest_receipt),
    ("insurance", "Home Insurance Policy", dest_insurance),
    ("warranty", "Extended Warranty Info", dest_insurance)
]

BILL_PROVIDERS = [
    ("Pacific Gas & Electric", "electricity", [80, 250]),
    ("City Water Dept", "water", [30, 90]),
    ("Comcast Xfinity", "internet", [60, 120]),
    ("Waste Management", "trash", [20, 50]),
]

async def seed_bulk_data():
    async with AsyncSessionLocal() as session:
        user_id = 1
        today = date.today()
        
        # 1. Generate 20 Appliances
        print("Generating Appliances...")
        for i in range(20):
            cat, brands, price_range, lifespan = random.choice(APPLIANCE_TYPES)
            brand = random.choice(brands)
            name = f"{brand} {cat.capitalize().replace('_', ' ')}"
            price = round(random.uniform(price_range[0], price_range[1]), 2)
            purchase_date = today - timedelta(days=random.randint(100, 5000))
            
            app = Appliance(
                user_id=user_id,
                name=name,
                category=cat,
                brand=brand,
                model_number=f"MOD-{random.randint(1000,9999)}",
                serial_number=f"SN-{random.randint(100000,999999)}",
                purchase_date=purchase_date,
                purchase_price=price,
                purchase_retailer=random.choice(["Home Depot", "Lowe's", "Best Buy", "Costco"]),
                location=random.choice(["Kitchen", "Basement", "Living Room", "Laundry Room"]),
                expected_lifespan_years=lifespan,
                estimated_annual_energy_cost=random.randint(20, 200),
                invoice_image_path=dest_receipt if random.random() > 0.5 else None
            )
            session.add(app)
            await session.flush()
            
            # 70% chance of warranty
            if random.random() > 0.3:
                w_type = random.choice(["manufacturer", "extended"])
                w_duration = 1 if w_type == "manufacturer" else random.choice([3, 5])
                warranty = Warranty(
                    user_id=user_id,
                    appliance_id=app.id,
                    warranty_type=w_type,
                    start_date=purchase_date,
                    expiry_date=purchase_date + relativedelta(years=w_duration),
                    provider_name=brand if w_type == "manufacturer" else "SquareTrade",
                    claim_phone="1-800-555-0199"
                )
                session.add(warranty)
        
        # 2. Generate 20 Documents
        print("Generating Documents...")
        for i in range(20):
            doc_cat, doc_title_base, file_url = random.choice(DOCUMENT_TYPES)
            doc_date = today - timedelta(days=random.randint(10, 365))
            
            doc = Document(
                user_id=user_id,
                title=f"{doc_title_base} - {doc_date.strftime('%b %Y')}",
                document_type=doc_cat,
                image_path=file_url,
                purchase_date=doc_date,
                store_name=random.choice(["Home Depot", "State Farm", "PG&E"]) if doc_cat != "insurance" else "State Farm",
                total_amount=round(random.uniform(50, 1500), 2) if doc_cat in ["receipt", "bill"] else None
            )
            
            if doc_cat == "receipt" and random.random() > 0.5:
                doc.return_expiration_date = doc_date + timedelta(days=random.choice([30, 90, 180]))
                
            session.add(doc)
            
        # 3. Generate 24 Bills (Last 12 months for 2 providers)
        print("Generating Bills...")
        for i in range(12):
            bill_date = today - relativedelta(months=i)
            
            # Electric
            prov, b_cat, b_range = BILL_PROVIDERS[0]
            session.add(Bill(
                user_id=user_id,
                provider=prov,
                amount=round(random.uniform(b_range[0], b_range[1]), 2),
                due_date=bill_date.replace(day=15),
                billing_period=bill_date.strftime("%B %Y"),
                image_path=dest_bill if random.random() > 0.3 else None
            ))
            
            # Water
            prov2, b_cat2, b_range2 = BILL_PROVIDERS[1]
            session.add(Bill(
                user_id=user_id,
                provider=prov2,
                amount=round(random.uniform(b_range2[0], b_range2[1]), 2),
                due_date=bill_date.replace(day=20),
                billing_period=bill_date.strftime("%B %Y"),
                image_path=dest_bill if random.random() > 0.3 else None
            ))
            
        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(seed_bulk_data())
