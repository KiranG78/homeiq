import asyncio
from mcp.server.fastmcp import FastMCP
import sqlite3
import json

mcp = FastMCP("Bills Server")

def get_db_connection():
    # SQLite connection to the backend database
    # The MCP server runs in backend/mcp_servers/
    conn = sqlite3.connect("../homeiq.db")
    conn.row_factory = sqlite3.Row
    return conn

@mcp.tool()
def get_bill_history(provider: str = None) -> str:
    """
    Retrieve historical bills.
    If provider is specified, filter by provider.
    Otherwise, returns all bills.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if provider:
            cursor.execute("SELECT provider, amount, due_date, billing_period FROM bills WHERE provider LIKE ? ORDER BY due_date DESC", (f"%{provider}%",))
        else:
            cursor.execute("SELECT provider, amount, due_date, billing_period FROM bills ORDER BY due_date DESC")
            
        bills = [dict(row) for row in cursor.fetchall()]
        if not bills:
            return "No bills found."
            
        return json.dumps(bills, indent=2)
    except Exception as e:
        return f"Database error: {str(e)}"
    finally:
        conn.close()

if __name__ == "__main__":
    mcp.run()
