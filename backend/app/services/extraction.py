import google.generativeai as genai
from PIL import Image
import json
import io
import base64
from app.core.config import settings

if settings.LLM_PROVIDER == "ADK":
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
elif settings.LLM_PROVIDER == "CLAUDE":
    from anthropic import AsyncAnthropic
    anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

EXTRACTION_PROMPT = """
You are analyzing an invoice, receipt, or warranty card image for a home appliance.

Extract the following information and return ONLY a valid JSON object.
If a field is not visible or not applicable, use null.

Return exactly this JSON structure:
{
  "appliance_name": "descriptive name like 'Kitchen Refrigerator'",
  "category": "one of: hvac, refrigerator, dishwasher, washer, dryer, oven, water_heater, other",
  "brand": "manufacturer brand name",
  "model_number": "model number exactly as shown",
  "serial_number": "serial number if visible",
  "purchase_date": "YYYY-MM-DD format or null",
  "purchase_price": numeric value only no currency symbol or null,
  "purchase_retailer": "store name if visible",
  "warranty_expiry_date": "YYYY-MM-DD format or null",
  "warranty_duration_note": "e.g. 1 year parts and labor if expiry not explicit",
  "warranty_provider": "who provides the warranty",
  "claim_phone": "phone number if visible",
  "claim_url": "website if visible",
  "confidence": "high medium or low — your confidence in the extraction"
}

Return ONLY the JSON. No explanation. No markdown code fences.
"""

async def extract_from_invoice_image(image_bytes: bytes) -> dict:
    """
    Sends invoice image to the selected LLM provider (Gemini or Claude).
    Returns structured appliance + warranty fields.
    """
    if settings.LLM_PROVIDER == "ADK":
        image = Image.open(io.BytesIO(image_bytes))
        response = await gemini_model.generate_content_async([EXTRACTION_PROMPT, image])
        raw_text = response.text.strip()
    else:
        # Claude expects base64 encoded image
        image_obj = Image.open(io.BytesIO(image_bytes))
        img_format = image_obj.format.lower() if image_obj.format else "jpeg"
        if img_format == "jpg": img_format = "jpeg"
        media_type = f"image/{img_format}"

        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": EXTRACTION_PROMPT
                        }
                    ],
                }
            ],
        )
        raw_text = response.content[0].text.strip()

    # Strip markdown code fences if LLM adds them
    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else raw_text
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]

    return json.loads(raw_text.strip())

BILL_EXTRACTION_PROMPT = """
You are analyzing a utility bill (electricity, water, gas, internet, HOA, etc.).
Extract the following information and return ONLY a valid JSON object.
If a field is not visible, use null.

Return exactly this JSON structure:
{
  "provider": "company name (e.g. PG&E, Comcast)",
  "amount": numeric value only no currency symbol (e.g. 124.50),
  "due_date": "YYYY-MM-DD format or null",
  "billing_period": "e.g. 'Oct 2023' or 'Oct 1 - Oct 31'"
}

Return ONLY the JSON. No explanation. No markdown code fences.
"""

async def extract_bill_data(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes))
    response = await model.generate_content_async([BILL_EXTRACTION_PROMPT, image])
    raw_text = response.text.strip()
    
    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else raw_text
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
            
    return json.loads(raw_text.strip())

SMART_SCAN_PROMPT = """
You are analyzing an image of a document. It could be an appliance invoice, warranty, utility bill, retail shopping receipt, grocery receipt, or a home document (like insurance, tax bill, HOA).

Determine the category of the document, and extract relevant fields.

Category options:
- "appliance" (buying a fridge, TV, dishwasher)
- "utility_bill" (electricity, water, internet)
- "receipt" (retail store, clothing, bestbuy, target)
- "grocery" (supermarket, food)
- "home_doc" (insurance policy, property tax, HOA guidelines)

Return ONLY a valid JSON object with the following structure. Use null if a field is not visible/applicable:
{
  "category": "one of the options above",
  "title": "A short descriptive title (e.g. Target Receipt, PG&E Bill, GE Fridge Invoice)",
  "store_name": "Store, provider, or company name",
  "total_amount": numeric value only no currency symbol or null,
  "purchase_date": "YYYY-MM-DD format or null",
  "return_expiration_date": "YYYY-MM-DD format or null (calculate this if a return window like 14 or 30 days is stated on the receipt, relative to purchase date)",
  
  "appliance_data": {
      "appliance_name": "name",
      "category": "hvac, refrigerator, etc.",
      "brand": "brand",
      "model_number": "model",
      "serial_number": "serial",
      "purchase_price": numeric,
      "warranty_expiry_date": "YYYY-MM-DD"
  },
  "bill_data": {
      "billing_period": "e.g. Oct 2023",
      "due_date": "YYYY-MM-DD"
  },
  "extracted_text": "A brief summary of the key information in the document"
}

Return ONLY the JSON. No explanation. No markdown code fences.
"""

async def extract_smart_scan(image_bytes: bytes) -> dict:
    if settings.LLM_PROVIDER == "ADK":
        image = Image.open(io.BytesIO(image_bytes))
        response = await gemini_model.generate_content_async([SMART_SCAN_PROMPT, image])
        raw_text = response.text.strip()
    else:
        image_obj = Image.open(io.BytesIO(image_bytes))
        img_format = image_obj.format.lower() if image_obj.format else "jpeg"
        if img_format == "jpg": img_format = "jpeg"
        media_type = f"image/{img_format}"

        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": SMART_SCAN_PROMPT
                        }
                    ],
                }
            ],
        )
        raw_text = response.content[0].text.strip()

    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else raw_text
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
            
    return json.loads(raw_text.strip())
