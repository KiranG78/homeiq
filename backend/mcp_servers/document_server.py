from fastmcp import FastMCP
import sqlite3
import json

mcp = FastMCP("homeiq-document-server")
DB_PATH = "../homeiq.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@mcp.tool()
def search_documents(query: str = "") -> str:
    """
    Searches documents (receipts, bills, policies, etc.) in the vault for a given query (e.g., store name or document title).
    If no query is provided, returns all documents.
    """
    conn = get_connection()
    c = conn.cursor()
    
    # Simple search on store_name, title, or document_type
    sql = """
        SELECT id, document_type, title, store_name, total_amount, purchase_date, return_expiration_date, extracted_text
        FROM documents
        WHERE user_id = 1
    """
    params = []
    if query:
        sql += " AND (store_name LIKE ? OR title LIKE ? OR document_type LIKE ? OR extracted_text LIKE ?)"
        q = f"%{query}%"
        params.extend([q, q, q, q])
        
    c.execute(sql, params)
    docs = [dict(row) for row in c.fetchall()]
    conn.close()
    
    if not docs:
        return json.dumps({"status": "no documents found matching the query"})
    
    return json.dumps(docs, default=str)

@mcp.tool()
def get_recent_receipts(limit: int = 5) -> str:
    """
    Returns the most recent receipts scanned into the vault.
    Useful for questions about recent shopping or purchases.
    """
    conn = get_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT id, document_type, title, store_name, total_amount, purchase_date, extracted_text
        FROM documents
        WHERE user_id = 1 AND document_type = 'receipt'
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    docs = [dict(row) for row in c.fetchall()]
    conn.close()
    
    if not docs:
        return json.dumps({"status": "no recent receipts found"})
        
    return json.dumps(docs, default=str)

if __name__ == "__main__":
    mcp.run()
