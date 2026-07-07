# HomeIQ

HomeIQ is a demoable product where users can register their home appliances and have a natural language conversation with an AI agent about them. It features an automated invoice photo extraction system and real-time chat powered by Google ADK and MCP.

## Prerequisites
- Python 3.12
- Node.js (18+)
- Google Gemini API Key
- Anthropic API Key (Optional, for Claude support)

## Setup & Running

### 1. Environment Configuration
Create a `.env` file in the `backend/` directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
LLM_PROVIDER=CLAUDE # or GEMINI
GEMINI_MODEL=gemini-2.5-flash
CLAUDE_MODEL=claude-haiku-4-5
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Seed Database (Optional but recommended for demo)
Populates the database with sample data.
```bash
cd backend
venv\Scripts\python seed_db.py
```
*Note: Additional scripts like `generate_bulk_test_data.py` and `generate_dashboard_data.py` are available for more extensive testing.*

### 5. Running the Application
You will need two terminal windows:

**Terminal 1 (Backend - FastAPI & ADK):**
```bash
cd backend
venv\Scripts\uvicorn app.main:app --reload --port 8000
```
*(Note: The MCP servers for appliances and warranties are automatically managed and spawned by the Google ADK runner.)*

**Terminal 2 (Frontend - React & Vite):**
```bash
cd frontend
npm run dev
```

### 6. Using the Demo
1. Open your browser to `http://localhost:5173`
2. **Dashboard**: View a high-level summary of your home assets.
3. **Vault**: Manage all your home assets (appliances), documents, and utility bills in one place.
4. **Smart Scan**: Try the "Smart Scan" feature with an image of a receipt/invoice (the AI will extract details automatically).
4. **Chat**: Navigate to the Chat tab and ask questions like:
   - "Which of my appliances are out of warranty?"
   - "Give me a home health summary."
   - "When does the AC warranty expire?"
   - "Tell me about my water heater."

## Architecture Overview
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: FastAPI + SQLite
- **Agents**: Google ADK (Agent Development Kit) with support for Gemini 2.5 Flash and Claude Haiku 4.5
- **MCP Servers**: Local FastMCP servers handle the tools for age analysis, warranty computations, and other integrations.
