import asyncio
from mcp.server.fastmcp import FastMCP
import sqlite3
import json

mcp = FastMCP("Contractor Server")

def get_db_connection():
    conn = sqlite3.connect("../homeiq.db")
    conn.row_factory = sqlite3.Row
    return conn

@mcp.tool()
def find_contractors(specialty: str = None, min_rating: float = 0.0) -> str:
    """
    Find local contractors for appliance repairs.
    Optionally filter by specialty (e.g. HVAC, Refrigerator, Plumbing, General) and minimum rating (0-5).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT name, phone, rating, specialty, rate_per_hour FROM contractors WHERE rating >= ?"
        params = [min_rating]
        
        if specialty:
            query += " AND specialty LIKE ?"
            params.append(f"%{specialty}%")
            
        query += " ORDER BY rating DESC"
        
        cursor.execute(query, params)
        contractors = [dict(row) for row in cursor.fetchall()]
        
        if not contractors:
            return "No contractors found matching criteria."
            
        return json.dumps(contractors, indent=2)
    except Exception as e:
        return f"Database error: {str(e)}"
    finally:
        conn.close()

if __name__ == "__main__":
    mcp.run()
