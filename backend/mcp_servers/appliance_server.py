from fastmcp import FastMCP
from datetime import date
import sqlite3
import json

mcp = FastMCP("homeiq-appliance-server")
DB_PATH = "../homeiq.db"

# Skill 4 — static lifespan lookup table, no external API needed
AVERAGE_LIFESPAN_YEARS = {
    "hvac": 15, "water_heater": 10, "refrigerator": 13,
    "dishwasher": 9, "washer": 10, "dryer": 13,
    "oven": 15, "other": 10,
}

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def enrich_appliance(item: dict) -> dict:
    """Add age, age_status, warranty_status to any appliance dict."""
    if item.get("purchase_date"):
        purchase = date.fromisoformat(item["purchase_date"])
        age_years = (date.today() - purchase).days / 365.25
        avg_lifespan = AVERAGE_LIFESPAN_YEARS.get(item.get("category", "other"), 10)
        ratio = age_years / avg_lifespan
        item["age_years"] = round(age_years, 1)
        item["avg_lifespan_years"] = avg_lifespan
        item["lifespan_used_pct"] = round(ratio * 100)
        item["age_status"] = (
            "critical" if ratio >= 1.0 else
            "warning"  if ratio >= 0.75 else
            "good"
        )
    if item.get("expiry_date"):
        expiry = date.fromisoformat(item["expiry_date"])
        days_left = (expiry - date.today()).days
        item["days_remaining"] = days_left
        item["warranty_status"] = (
            "expired"       if days_left < 0 else
            "expiring_soon" if days_left <= 90 else
            "active"
        )
    else:
        item["warranty_status"] = "no_warranty"
    return item

@mcp.tool()
def list_all_appliances() -> str:
    """
    Returns all appliances with age, age_status (good/warning/critical),
    lifespan_used_pct, and warranty_status. Used by Explain Agent for
    listing and age awareness (Skill 4).
    """
    conn = get_connection()
    user_id = 1
    rows = conn.execute("""
        SELECT a.*, w.expiry_date, w.coverage_summary, w.claim_phone
        FROM appliances a
        LEFT JOIN warranties w ON w.appliance_id = a.id
        WHERE a.user_id = ?
        ORDER BY a.name
    """, (user_id,)).fetchall()
    conn.close()
    return json.dumps([enrich_appliance(dict(r)) for r in rows], default=str)

@mcp.tool()
def get_appliance_detail(appliance_id: int) -> str:
    """
    Returns full details for a specific appliance including all warranty
    fields and age analysis (Skill 4). Used when user asks about one appliance.
    """
    conn = get_connection()
    row = conn.execute("""
        SELECT a.*, w.expiry_date, w.start_date, w.warranty_type,
               w.coverage_summary, w.what_is_covered, w.what_is_not_covered,
               w.claim_phone, w.claim_url, w.claim_email, w.provider_name
        FROM appliances a
        LEFT JOIN warranties w ON w.appliance_id = a.id
        WHERE a.id = ?
    """, (appliance_id,)).fetchone()
    conn.close()
    if not row:
        return json.dumps({"error": f"Appliance {appliance_id} not found"})
    return json.dumps(enrich_appliance(dict(row)), default=str)

@mcp.tool()
def filter_appliances(category: str = None, warranty_status: str = None,
                      age_status: str = None) -> str:
    """
    Filter appliances by category, warranty_status, or age_status.
    age_status options: good | warning | critical
    """
    user_id = 1
    all_appliances = json.loads(list_all_appliances())
    results = all_appliances
    if category:
        results = [a for a in results if a.get("category") == category]
    if warranty_status:
        results = [a for a in results if a.get("warranty_status") == warranty_status]
    if age_status:
        results = [a for a in results if a.get("age_status") == age_status]
    return json.dumps(results, default=str)

@mcp.tool()
def get_home_summary() -> str:
    """
    Full home summary: appliance counts, warranty breakdown, age breakdown.
    """
    user_id = 1
    all_appliances = json.loads(list_all_appliances())
    return json.dumps({
        "total_appliances":  len(all_appliances),
        "warranty_active":   sum(1 for a in all_appliances if a.get("warranty_status") == "active"),
        "warranty_expiring": sum(1 for a in all_appliances if a.get("warranty_status") == "expiring_soon"),
        "warranty_expired":  sum(1 for a in all_appliances if a.get("warranty_status") == "expired"),
        "warranty_none":     sum(1 for a in all_appliances if a.get("warranty_status") == "no_warranty"),
        "age_good":          sum(1 for a in all_appliances if a.get("age_status") == "good"),
        "age_warning":       sum(1 for a in all_appliances if a.get("age_status") == "warning"),
        "age_critical":      sum(1 for a in all_appliances if a.get("age_status") == "critical"),
        "appliances":        all_appliances,
    }, default=str)

if __name__ == "__main__":
    mcp.run(transport="stdio")
