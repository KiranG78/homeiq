from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.extraction import extract_smart_scan
from app.core.config import settings
from app.models.document import Document
from app.models.appliance import Appliance
from app.models.bill import Bill
from app.models.warranty import Warranty
from datetime import datetime
import os
import json

router = APIRouter()

@router.post("/")
async def smart_scan(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are supported (JPEG, PNG, WEBP)")

    image_bytes = await file.read()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"scan_{timestamp}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
        
    image_path = f"/uploads/{filename}"

    # Use LLM to extract
    extracted_data = await extract_smart_scan(image_bytes)
    category = extracted_data.get("category")
    
    # We will hardcode user_id=1 for now as per Phase 1
    user_id = 1
    
    def parse_date(d_str):
        if not d_str: return None
        try:
            return datetime.strptime(d_str, "%Y-%m-%d").date()
        except:
            return None

    if category == "appliance":
        app_data = extracted_data.get("appliance_data", {})
        new_app = Appliance(
            user_id=user_id,
            name=app_data.get("appliance_name", extracted_data.get("title", "Unknown Appliance")),
            category=app_data.get("category", "other"),
            brand=app_data.get("brand"),
            model_number=app_data.get("model_number"),
            serial_number=app_data.get("serial_number"),
            purchase_price=app_data.get("purchase_price"),
            purchase_date=parse_date(extracted_data.get("purchase_date")),
            invoice_image_path=image_path,
            extracted_raw_text=extracted_data.get("extracted_text"),
            extracted_json=json.dumps(extracted_data)
        )
        db.add(new_app)
        await db.flush() # get ID
        
        warranty_expiry = app_data.get("warranty_expiry_date")
        if warranty_expiry:
            warranty = Warranty(
                appliance_id=new_app.id,
                expiry_date=parse_date(warranty_expiry),
                warranty_type="manufacturer"
            )
            db.add(warranty)
            
    elif category == "utility_bill":
        bill_data = extracted_data.get("bill_data", {})
        new_bill = Bill(
            user_id=user_id,
            provider=extracted_data.get("store_name"),
            amount=extracted_data.get("total_amount"),
            due_date=parse_date(bill_data.get("due_date")),
            billing_period=bill_data.get("billing_period"),
            image_path=image_path,
            extracted_json=json.dumps(extracted_data)
        )
        db.add(new_bill)
        
    elif category in ["receipt", "grocery", "home_doc"]:
        new_doc = Document(
            user_id=user_id,
            document_type=category,
            title=extracted_data.get("title"),
            store_name=extracted_data.get("store_name"),
            total_amount=extracted_data.get("total_amount"),
            purchase_date=parse_date(extracted_data.get("purchase_date")),
            return_expiration_date=parse_date(extracted_data.get("return_expiration_date")),
            extracted_text=extracted_data.get("extracted_text"),
            extracted_json=json.dumps(extracted_data),
            image_path=image_path
        )
        db.add(new_doc)
    else:
        # fallback to document
        new_doc = Document(
            user_id=user_id,
            document_type="other",
            title=extracted_data.get("title"),
            extracted_text=extracted_data.get("extracted_text"),
            extracted_json=json.dumps(extracted_data),
            image_path=image_path
        )
        db.add(new_doc)

    await db.commit()

    return {
        "success": True,
        "category": category,
        "extracted_data": extracted_data,
        "image_path": image_path
    }
