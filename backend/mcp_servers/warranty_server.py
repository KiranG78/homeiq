from fastmcp import FastMCP
from datetime import date
import sqlite3
import json

mcp = FastMCP("homeiq-warranty-server")
DB_PATH = "../homeiq.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@mcp.tool()
def check_warranty_status(appliance_id: int) -> str:
    """
    Check if an appliance is currently under warranty.
    Returns coverage details, expiry date, and claim contact information.
    """
    conn = get_connection()
    row = conn.execute("""
        SELECT a.name, a.brand, a.model_number, a.purchase_date,
               w.expiry_date, w.warranty_type, w.coverage_summary,
               w.what_is_covered, w.what_is_not_covered,
               w.claim_phone, w.claim_url, w.claim_email, w.provider_name
        FROM appliances a
        LEFT JOIN warranties w ON w.appliance_id = a.id
        WHERE a.id = ?
    """, (appliance_id,)).fetchone()
    conn.close()

    if not row:
        return json.dumps({"error": "Appliance not found"})

    item = dict(row)
    if not item.get("expiry_date"):
        item["warranty_status"] = "no_warranty"
        item["message"] = "No warranty information registered for this appliance."
        return json.dumps(item, default=str)

    expiry = date.fromisoformat(item["expiry_date"])
    days_remaining = (expiry - date.today()).days
    item["days_remaining"] = days_remaining
    item["warranty_status"] = (
        "expired" if days_remaining < 0
        else "expiring_soon" if days_remaining <= 90
        else "active"
    )
    return json.dumps(item, default=str)

@mcp.tool()
def get_expiring_warranties(days_ahead: int = 90) -> str:
    """
    Returns all warranties expiring within the specified number of days.
    Default is 90 days.
    """
    conn = get_connection()
    user_id = 1
    rows = conn.execute("""
        SELECT a.id as appliance_id, a.name, a.brand, a.model_number,
               w.expiry_date, w.coverage_summary, w.claim_phone, w.claim_url
        FROM appliances a
        JOIN warranties w ON w.appliance_id = a.id
        WHERE a.user_id = ?
          AND w.expiry_date BETWEEN date('now') AND date('now', ? || ' days')
        ORDER BY w.expiry_date ASC
    """, (user_id, days_ahead)).fetchall()
    conn.close()

    results = []
    for row in rows:
        item = dict(row)
        expiry = date.fromisoformat(item["expiry_date"])
        item["days_remaining"] = (expiry - date.today()).days
        results.append(item)

    return json.dumps(results, default=str)

@mcp.tool()
def get_claim_contact(appliance_id: int) -> str:
    """
    Returns the warranty claim contact information for an appliance:
    phone number, website URL, and email.
    """
    conn = get_connection()
    row = conn.execute("""
        SELECT a.name, a.brand, w.claim_phone, w.claim_url,
               w.claim_email, w.provider_name, w.warranty_type
        FROM appliances a
        JOIN warranties w ON w.appliance_id = a.id
        WHERE a.id = ?
    """, (appliance_id,)).fetchone()
    conn.close()

    if not row:
        return json.dumps({"error": "No warranty claim info found for this appliance"})
    return json.dumps(dict(row))

@mcp.tool()
def get_all_warranty_statuses() -> str:
    """
    Returns warranty status for every registered appliance.
    Useful for answering 'which appliances are out of warranty?'
    """
    conn = get_connection()
    user_id = 1
    rows = conn.execute("""
        SELECT a.id, a.name, a.brand, a.category,
               w.expiry_date, w.coverage_summary
        FROM appliances a
        LEFT JOIN warranties w ON w.appliance_id = a.id
        WHERE a.user_id = ?
        ORDER BY a.name
    """, (user_id,)).fetchall()
    conn.close()

    results = []
    for row in rows:
        item = dict(row)
        if item.get("expiry_date"):
            expiry = date.fromisoformat(item["expiry_date"])
            days_remaining = (expiry - date.today()).days
            item["days_remaining"] = days_remaining
            item["warranty_status"] = (
                "expired" if days_remaining < 0
                else "expiring_soon" if days_remaining <= 90
                else "active"
            )
        else:
            item["warranty_status"] = "no_warranty"
        results.append(item)

    return json.dumps(results, default=str)

@mcp.tool()
def calculate_home_health_score() -> str:
    """
    Calculates a 0–100 score representing the overall health of the user's home
    based on registered appliances and warranty coverage (Skill 1).
    """
    import json
    
    conn = get_connection()
    user_id = 1
    rows = conn.execute("""
        SELECT a.id, a.name, a.category, a.purchase_date,
               w.expiry_date
        FROM appliances a
        LEFT JOIN warranties w ON w.appliance_id = a.id
        WHERE a.user_id = ?
    """, (user_id,)).fetchall()
    conn.close()

    if not rows:
        return json.dumps({"score": 0, "grade": "F", "message": "No appliances registered."})
        
    score = 50  # baseline
    
    AVERAGE_LIFESPAN_YEARS = {
        "hvac": 15, "water_heater": 10, "refrigerator": 13,
        "dishwasher": 9, "washer": 10, "dryer": 13,
        "oven": 15, "other": 10,
    }
    
    good_items = []
    attention_items = []
    critical_items = []

    for r in rows:
        item = dict(r)
        
        status = "no_warranty"
        if item.get("expiry_date"):
            expiry = date.fromisoformat(item["expiry_date"])
            days_left = (expiry - date.today()).days
            if days_left < 0:
                status = "expired"
                attention_items.append(f"{item['name']} warranty expired {-days_left} days ago")
            elif days_left <= 90:
                status = "expiring_soon"
                attention_items.append(f"{item['name']} warranty expires in {days_left} days")
            else:
                status = "active"
                good_items.append(f"{item['name']} warranty active until {item['expiry_date']}")

        ratio = 0.5
        if item.get("purchase_date"):
            purchase = date.fromisoformat(item["purchase_date"])
            age_years = (date.today() - purchase).days / 365.25
            avg_lifespan = AVERAGE_LIFESPAN_YEARS.get(item.get("category", "other"), 10)
            ratio = age_years / avg_lifespan
            
            if ratio >= 1.0:
                critical_items.append(f"{item['name']} is {round(age_years,1)} years old (past {avg_lifespan}yr lifespan)")
            elif ratio >= 0.75:
                attention_items.append(f"{item['name']} is {round(age_years,1)} years old (approaching {avg_lifespan}yr lifespan)")

        if status == "active":         score += 10
        elif status == "expiring_soon": score += 3
        elif status == "expired":       score -= 5
        elif status == "no_warranty":   score -= 2

        if ratio > 0.85:   score -= 8   # near end of life
        elif ratio > 0.65: score -= 3   # approaching end of life

    final_score = max(0, min(100, score))
    
    grade = "F"
    if final_score >= 85: grade = "A"
    elif final_score >= 70: grade = "B"
    elif final_score >= 55: grade = "C"
    elif final_score >= 40: grade = "D"

    return json.dumps({
        "score": final_score,
        "grade": grade,
        "good": good_items,
        "attention": attention_items,
        "critical": critical_items
    })

if __name__ == "__main__":
    mcp.run(transport="stdio")
