# HomeIQ — Phase 1 Implementation Plan

**Product:** HomeIQ — AI Home Management Agent  
**Phase:** 1 — Foundation & MVP  
**Author:** Shubham Chhimpa  
**Stack:** React · FastAPI · SQLite · Google ADK · Gemini 2.0 Flash · MCP  
**Duration:** 8 Weeks  
**Goal:** A working, demoable product where a user registers their home appliances and has a real conversation with an AI agent about them.

---

## Table of Contents

1. [Phase 1 Goal & Demo Story](#1-phase-1-goal--demo-story)
2. [What's In and What's Out](#2-whats-in-and-whats-out)
3. [Tech Stack — Why Google ADK](#3-tech-stack--why-google-adk)
4. [Agent Skills — Phase 1](#4-agent-skills--phase-1)
5. [Project Structure](#5-project-structure)
6. [Database Design — SQLite Schema](#6-database-design--sqlite-schema)
7. [Backend — FastAPI](#7-backend--fastapi)
8. [MCP Servers](#8-mcp-servers)
9. [Agent Layer — Google ADK](#9-agent-layer--google-adk)
10. [Frontend — React](#10-frontend--react)
11. [Invoice Photo Extraction — Gemini Vision](#11-invoice-photo-extraction--gemini-vision)
12. [End-to-End Demo Flows](#12-end-to-end-demo-flows)
13. [Week-by-Week Execution Plan](#13-week-by-week-execution-plan)
14. [Environment Setup](#14-environment-setup)
15. [What Phase 2 Will Add](#15-what-phase-2-will-add)

---

## 1. Phase 1 Goal & Demo Story

### The Single Goal

Build a product where a user can:
1. Register their home appliances (manually or by uploading an invoice photo)
2. Open a chat and ask natural language questions about their appliances and warranties
3. Get accurate, real answers backed by their actual data

### The Demo in 5 Steps

```
Step 1 — User fills in home profile (name, address, zip code)

Step 2 — User clicks "Add Appliance" and uploads a photo of their AC invoice
         → Gemini Vision extracts: Carrier AC, Model 24ACC636A003,
           purchased March 2021, warranty until March 2026
         → User confirms → saved to SQLite

Step 3 — User adds a second appliance manually
         (Bosch Dishwasher, purchased Jan 2020, warranty expired Jan 2023)

Step 4 — User opens Chat and asks:
         "Tell me about my AC and is it still under warranty?"
         → Supervisor detects: ["explain", "warranty"] — both agents needed
         → Explain Agent + Warranty Agent run in parallel
         → Merged answer streams back:
           "Your Carrier AC (24ACC636A003) was purchased in March 2021
            and is now 4 years old. It is currently under warranty until
            March 2026 — coverage includes parts and labor."

Step 5 — User asks: "Which of my appliances are out of warranty?"
         → Warranty Agent checks all appliances
         → "Your Bosch Dishwasher's warranty expired in January 2023."
```

That's the complete Phase 1 demo. Simple, real, impressive.

---

## 2. What's In and What's Out

### ✅ In Scope — Phase 1

**Data Entry**
- Home profile setup screen (name, address, zip code)
- Manual appliance registration form
- Invoice / receipt photo upload → Gemini Vision auto-extraction → confirm and save
- Edit and delete registered appliances
- Appliance list view with warranty status badges

**Agent Skills (New)**
- Skill 1: Home Health Score — computed score 0–100 from appliance and warranty data
- Skill 2: Warranty Expiry Countdown — agent proactively flags expiring warranties even when not asked
- Skill 3: Smart Suggested Questions — 2–3 relevant follow-up chips after every response
- Skill 4: Appliance Age Awareness — agent flags appliances nearing end of average lifespan

**Agent Layer (Google ADK)**
- Supervisor Agent (intent classification + appliance resolution + routing)
- Explain Agent (list, describe, filter appliances + age awareness + expiry countdown)
- Warranty Agent (check coverage, expiry date, claim contact + health score)
- Multi-agent query handling (parallel execution + response merge)
- Clarification handling when question is too vague

**MCP Servers**
- Appliance MCP Server (reads appliance data from SQLite + lifespan lookup for Skill 4)
- Warranty MCP Server (reads warranty data from SQLite + health score tool for Skill 1)

**Frontend**
- Home profile screen
- Appliance list with quick stats bar (total | active warranty | needs attention)
- Category filter tabs on appliance list (All | HVAC | Kitchen | Laundry | Other)
- Add appliance form (manual entry)
- Upload invoice photo flow (extract → confirm → save)
- Edit appliance screen
- Chat interface with streaming, tool call indicators, suggested question chips (Skill 3)

**Backend**
- FastAPI REST endpoints (home profile CRUD, appliances CRUD)
- Document upload + Gemini Vision extraction endpoint
- WebSocket endpoint for streaming agent chat
- SQLite database with SQLAlchemy ORM

### ❌ Out of Scope — Phase 1

| Feature | Phase |
|---|---|
| Bill tracking and anomaly detection | Phase 2 |
| PDF warranty document upload and parsing | Phase 2 |
| Proactive notifications and reminders | Phase 2 |
| Contractor search and booking | Phase 2 |
| Failure risk scoring / ML | Phase 3 |
| Mobile app (React Native) | Phase 3 |
| Multi-user / family sharing | Phase 3 |
| Vector embeddings and semantic search | Phase 2 |
| PostgreSQL migration | Phase 2 |

---

## 4. Agent Skills — Phase 1

Four skills are layered on top of the two core agents. They require no new agents, no external APIs, and minimal extra code — but significantly increase the perceived intelligence of the product.

---

### Skill 1 — Home Health Score

**What it does:** Calculates a 0–100 score representing the overall health of the user's home based on registered appliances and warranty coverage.

**Trigger:** User asks "How healthy is my home?" / "Give me a home summary" / "What needs attention?"

**Scoring logic:**

```python
def calculate_home_health_score(appliances):
    score = 50  # baseline for having appliances registered
    for appliance in appliances:
        status = appliance.get("warranty_status")
        ratio  = appliance.get("age_vs_lifespan_ratio", 0.5)

        if status == "active":         score += 10
        elif status == "expiring_soon": score += 3
        elif status == "expired":       score -= 5
        elif status == "no_warranty":   score -= 2

        if ratio > 0.85:   score -= 8   # near end of life
        elif ratio > 0.65: score -= 3   # approaching end of life

    return max(0, min(100, score))  # clamp to 0–100
```

**Grades:** A (≥85) · B (≥70) · C (≥55) · D (≥40) · F (<40)

**Where implemented:** One new tool `calculate_home_health_score()` in the Warranty MCP Server. Pure calculation from existing SQLite data — no external calls.

**Example response:**
```
User: "How healthy is my home?"

Agent: "Your home health score is 61/100 — Grade C.

✅ What's good:
  • LG Refrigerator — warranty active until June 2028
  • Carrier AC — warranty active until March 2026

⚠️ Needs attention:
  • Carrier AC warranty expires in 9 months
  • Bosch Dishwasher warranty expired 2 years ago

🔴 Flagged:
  • Rheem Water Heater is 11 years old — past average 10-year lifespan"

[Chips]: [What does my AC cover?] [Tell me about my water heater] [Which is oldest?]
```

---

### Skill 2 — Warranty Expiry Countdown

**What it does:** When the Explain Agent describes any appliance, it automatically checks the warranty expiry and flags it if expiring within 90 days — even when the user only asked about appliance details.

**Trigger:** Any time the Explain Agent returns information about an appliance with warranty expiring within 90 days.

**Where implemented:** A prompt-level instruction in the Explain Agent's system prompt. Zero new tools or code required.

**Key instruction added to Explain Agent:**
```
After describing any appliance, check its warranty_status from the tool result.
- "expiring_soon" (≤90 days): add ⚠️ with exact days remaining
- "expired": clearly state when it expired  
- "no_warranty": gently note no warranty is registered
Do this automatically even if the user did not ask about warranty.
```

**Example response:**
```
User: "Tell me about my dishwasher"

Agent: "Your Bosch Dishwasher (SHX88PZ55N) is in the Kitchen,
purchased from Best Buy in January 2020 — 5 years old. You paid $899.

🔴 Warranty alert: The manufacturer warranty expired January 2023,
2 years ago. There is no active coverage on this appliance."
```

---

### Skill 3 — Smart Suggested Questions

**What it does:** After every agent response, 2–3 relevant follow-up questions appear as clickable chips in the UI, guiding users to discover what the agent can do.

**Trigger:** End of every agent response — always.

**Where implemented:** A structured output instruction in both agent system prompts. The runner parses the JSON block out of the response text before streaming tokens to the frontend.

**Agent instruction:**
```
End every response with this JSON block on its own line:
{"suggested_questions": ["question 1", "question 2", "question 3"]}
Keep each question under 8 words. Base them on what you just answered.
```

**Runner parsing:**
```python
if '{"suggested_questions"' in text:
    idx = text.index('{"suggested_questions"')
    parsed = json.loads(text[idx:])
    suggested = parsed.get("suggested_questions", [])
    text = text[:idx].strip()   # clean from main response
```

**Frontend chip rendering:**
```tsx
<div className="flex flex-wrap gap-2 mt-3">
  {message.suggestedQuestions?.map((q) => (
    <button key={q} onClick={() => sendMessage(q)}
      className="text-sm px-3 py-1.5 rounded-full border border-gray-200
                 hover:bg-gray-50 text-gray-600 transition-colors">
      {q}
    </button>
  ))}
</div>
```

---

### Skill 4 — Appliance Age Awareness

**What it does:** The agent knows the average lifespan of each appliance category and flags appliances approaching or past their expected lifespan — surfacing risk the user may not have considered.

**Trigger:** Any time an appliance is listed or described individually.

**Where implemented:** Static JSON lookup in the Appliance MCP Server. All 4 existing tools already compute and return `age_status` and `lifespan_used_pct`. The Explain Agent's prompt instructs it to surface warnings.

**Lifespan table (static — no external API):**
```python
AVERAGE_LIFESPAN_YEARS = {
    "hvac": 15, "water_heater": 10, "refrigerator": 13,
    "dishwasher": 9, "washer": 10, "dryer": 13,
    "oven": 15, "other": 10,
}
```

**Status thresholds:**
- `good` — less than 75% of lifespan used
- `warning` — 75–99% of lifespan used → ⚠️
- `critical` — 100%+ of lifespan used → 🔴

**Example response:**
```
User: "Show me all my appliances"

Agent: "You have 4 appliances:

1. Carrier AC — 4.1 yrs | Basement | ✅ Warranty active
2. Bosch Dishwasher — 5.2 yrs | Kitchen | ⚠️ Warranty expired
3. LG Refrigerator — 2.0 yrs | Kitchen | ✅ Warranty active
4. Rheem Water Heater — 11.3 yrs | Basement | 🔴 Past average lifespan (10 yrs)
   No warranty on file."
```

---

### Skills Summary

| Skill | Where Implemented | New Code |
|---|---|---|
| Home Health Score | Warranty MCP Server — 1 new tool | ~40 lines Python |
| Warranty Expiry Countdown | Explain Agent system prompt | 0 lines — prompt only |
| Smart Suggested Questions | Both agent prompts + runner parser | ~20 lines Python + ~15 lines TSX |
| Appliance Age Awareness | Appliance MCP tools + Explain prompt | ~25 lines Python + prompt |

All 4 skills use only existing SQLite data. No external APIs. No new infrastructure.

---

## 3. Tech Stack — Why Google ADK

### The Switch from LangGraph to Google ADK

Google Agent Development Kit (ADK) is Google's own framework for building multi-agent systems. Released March 2025, it is designed specifically for Gemini models with native MCP support — no adapter packages needed.

**Comparison:**

| Capability | LangGraph | Google ADK |
|---|---|---|
| Multi-agent orchestration | ✅ Mature | ✅ Native |
| Gemini integration | ✅ via langchain-google-genai | ✅ First-class, built-in |
| MCP support | ✅ via langchain-mcp-adapters | ✅ Native, zero config |
| Stateful conversations | ✅ Checkpointing | ✅ Built-in sessions |
| Parallel agent execution | ✅ Send() API | ✅ Parallel agents native |
| Streaming | ✅ Full | ✅ Full |
| Package count needed | 4 packages | 1 package |
| Alignment with Google AI program | Indirect | Direct |

**Why ADK wins for this project:**
- You are using Gemini via Google AI Studio — ADK is built for exactly this combination
- MCP is native — no adapter layer, less code, less that can break
- One package (`google-adk`) replaces four (`langgraph`, `langchain`, `langchain-google-genai`, `langchain-mcp-adapters`)
- Built-in trace viewer (`adk web`) — no LangSmith account needed
- Directly aligned with the Google AI program you are targeting for the demo

**Package reduction:**
```
Before (LangGraph):               After (Google ADK):
  langgraph                         google-adk          ← replaces all 4
  langchain
  langchain-google-genai
  langchain-mcp-adapters
  google-generativeai               google-generativeai ← still needed for Vision
```

### Full Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Vite for dev server |
| **Styling** | Tailwind CSS | Fast, utility-first |
| **Backend** | FastAPI (Python 3.12) | Async, fast, Pydantic v2 |
| **Database** | SQLite | File-based, zero setup |
| **ORM** | SQLAlchemy 2.0 (async) | Works natively with SQLite |
| **Agent Framework** | Google ADK 0.4+ | Native Gemini + MCP + sessions |
| **LLM — Reasoning** | Gemini 2.0 Flash | Via Google AI Studio API key |
| **LLM — Vision** | Gemini 2.0 Flash | Same model, native multimodal |
| **MCP Framework** | FastMCP | Lightweight MCP server library |
| **Tracing** | ADK Web UI (built-in) | `adk web` command, no extra account |
| **File Storage** | Local filesystem | `uploads/` folder for invoice photos |

---

## 4. Project Structure

```
homeiq/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI app entry point
│   │   ├── database.py                  # SQLite + SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                  # SQLAlchemy ORM models
│   │   │   ├── appliance.py
│   │   │   └── warranty.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                  # Pydantic request/response schemas
│   │   │   ├── appliance.py
│   │   │   └── warranty.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── profile.py               # Home profile endpoints
│   │   │   ├── appliances.py            # Appliance CRUD endpoints
│   │   │   ├── documents.py             # Invoice photo upload + extraction
│   │   │   └── chat.py                  # WebSocket chat endpoint
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── supervisor.py            # All 3 ADK agent definitions:
│   │   │   │                            #   explain_agent, warranty_agent,
│   │   │   │                            #   supervisor_agent + MCPToolset connections
│   │   │   └── runner.py                # ADK Runner + stream_agent_response()
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── extraction.py            # Gemini Vision invoice extraction
│   │   │   └── appliance_service.py     # Business logic
│   │   └── core/
│   │       ├── __init__.py
│   │       └── config.py                # Settings (API keys, paths)
│   ├── mcp_servers/
│   │   ├── appliance_server.py          # Appliance MCP Server
│   │   └── warranty_server.py           # Warranty MCP Server
│   ├── uploads/                         # Invoice photo storage (gitignored)
│   ├── homeiq.db                        # SQLite database file (gitignored)
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Profile.tsx              # Home profile setup
│   │   │   ├── Appliances.tsx           # Appliance list view
│   │   │   ├── AddAppliance.tsx         # Manual form + photo upload
│   │   │   ├── EditAppliance.tsx        # Edit existing appliance
│   │   │   └── Chat.tsx                 # Chat interface
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── appliances/
│   │   │   │   ├── ApplianceCard.tsx
│   │   │   │   ├── ApplianceForm.tsx
│   │   │   │   ├── WarrantyBadge.tsx
│   │   │   │   ├── QuickStatsBar.tsx    # total | active warranty | needs attention
│   │   │   │   └── CategoryFilter.tsx   # All | HVAC | Kitchen | Laundry | Other
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ToolCallIndicator.tsx
│   │   │   │   └── SuggestedQuestions.tsx  # Skill 3 — clickable chips
│   │   │   └── upload/
│   │   │       ├── InvoiceUpload.tsx
│   │   │       └── ExtractedDataConfirm.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useAppliances.ts
│   │   │   └── useProfile.ts
│   │   ├── api/
│   │   │   └── client.ts                # Axios API client
│   │   └── types/
│   │       └── index.ts                 # Shared TypeScript types
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 5. Database Design — SQLite Schema

### Tables Overview

Phase 1 needs exactly **3 tables**. Nothing more.

```
users
  └── appliances  (one user → many appliances)
        └── warranties  (one appliance → one warranty)
```

### Table: users

Stores the home profile. Phase 1 is single-user (no auth needed for demo).

```sql
CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name   TEXT NOT NULL,
    email       TEXT,
    address     TEXT,
    zip_code    TEXT NOT NULL,
    city        TEXT,
    state       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> **Phase 1 note:** We store one user row. No login, no password, no JWT. The app assumes a single user for demo purposes. Auth comes in Phase 2.

### Table: appliances

The core table. Every appliance the user registers lives here.

```sql
CREATE TABLE appliances (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    name                TEXT NOT NULL,           -- "Main Floor AC", "Kitchen Dishwasher"
    category            TEXT NOT NULL,           -- hvac, refrigerator, dishwasher, washer,
                                                 -- dryer, oven, water_heater, other
    brand               TEXT,                    -- "Carrier", "Bosch", "LG"
    model_number        TEXT,                    -- "24ACC636A003"
    serial_number       TEXT,
    purchase_date       DATE,                    -- "2021-03-15"
    purchase_price      REAL,                    -- 1299.99
    purchase_retailer   TEXT,                    -- "Home Depot", "Best Buy"
    location            TEXT,                    -- "Basement", "Kitchen", "Upstairs"
    notes               TEXT,
    invoice_image_path  TEXT,                    -- local path to uploaded invoice photo
    extracted_raw_text  TEXT,                    -- raw text Gemini extracted from photo
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: warranties

One warranty per appliance. Contains all coverage details.

```sql
CREATE TABLE warranties (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    appliance_id         INTEGER NOT NULL REFERENCES appliances(id) ON DELETE CASCADE,
    user_id              INTEGER NOT NULL REFERENCES users(id),
    warranty_type        TEXT DEFAULT 'manufacturer',  -- manufacturer, extended, home_warranty
    start_date           DATE,
    expiry_date          DATE NOT NULL,
    coverage_summary     TEXT,           -- "Parts and labor covered in-home"
    what_is_covered      TEXT,           -- "Compressor, electrical components, refrigerant"
    what_is_not_covered  TEXT,           -- "Physical damage, filters, consumables"
    claim_phone          TEXT,           -- "1-800-227-7437"
    claim_url            TEXT,           -- "carrier.com/warranty"
    claim_email          TEXT,
    provider_name        TEXT,           -- "Carrier", "SquareTrade", "American Home Shield"
    notes                TEXT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Computed Fields (not stored — calculated at query time)

```python
# These are calculated in Python, not stored in DB

def get_warranty_status(expiry_date: date) -> str:
    today = date.today()
    days_remaining = (expiry_date - today).days
    if days_remaining < 0:
        return "expired"
    elif days_remaining <= 90:
        return "expiring_soon"   # amber
    else:
        return "active"          # green

def get_appliance_age_years(purchase_date: date) -> float:
    delta = date.today() - purchase_date
    return round(delta.days / 365.25, 1)
```

### SQLAlchemy ORM Models

```python
# backend/app/models/appliance.py
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Appliance(Base):
    __tablename__ = "appliances"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    user_id            = Column(Integer, ForeignKey("users.id"), nullable=False)
    name               = Column(String(255), nullable=False)
    category           = Column(String(100), nullable=False)
    brand              = Column(String(100))
    model_number       = Column(String(255))
    serial_number      = Column(String(255))
    purchase_date      = Column(Date)
    purchase_price     = Column(Float)
    purchase_retailer  = Column(String(255))
    location           = Column(String(100))
    notes              = Column(Text)
    invoice_image_path = Column(Text)
    extracted_raw_text = Column(Text)
    created_at         = Column(DateTime, server_default=func.now())
    updated_at         = Column(DateTime, server_default=func.now(), onupdate=func.now())

    warranty = relationship("Warranty", back_populates="appliance",
                            uselist=False, cascade="all, delete-orphan")
    user     = relationship("User", back_populates="appliances")
```

```python
# backend/app/models/warranty.py
class Warranty(Base):
    __tablename__ = "warranties"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    appliance_id        = Column(Integer, ForeignKey("appliances.id", ondelete="CASCADE"),
                                 nullable=False)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    warranty_type       = Column(String(50), default="manufacturer")
    start_date          = Column(Date)
    expiry_date         = Column(Date, nullable=False)
    coverage_summary    = Column(Text)
    what_is_covered     = Column(Text)
    what_is_not_covered = Column(Text)
    claim_phone         = Column(String(20))
    claim_url           = Column(Text)
    claim_email         = Column(String(255))
    provider_name       = Column(String(255))
    notes               = Column(Text)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    appliance = relationship("Appliance", back_populates="warranty")
```

### Database Initialization

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

SQLITE_URL = "sqlite+aiosqlite:///./homeiq.db"

engine = create_async_engine(SQLITE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 6. Backend — FastAPI

### Entry Point

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import profile, appliances, documents, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()          # create tables on startup
    yield

app = FastAPI(title="HomeIQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router,     prefix="/api/profile",     tags=["Profile"])
app.include_router(appliances.router,  prefix="/api/appliances",  tags=["Appliances"])
app.include_router(documents.router,   prefix="/api/documents",   tags=["Documents"])
app.include_router(chat.router,        prefix="/api",             tags=["Chat"])
```

### REST Endpoints

```
# Home Profile
GET    /api/profile              → get home profile
POST   /api/profile              → create profile (first run)
PUT    /api/profile              → update profile

# Appliances
GET    /api/appliances           → list all appliances (with warranty status)
POST   /api/appliances           → create appliance + optional warranty
GET    /api/appliances/{id}      → get single appliance detail
PUT    /api/appliances/{id}      → update appliance
DELETE /api/appliances/{id}      → delete appliance

# Documents (Invoice Photo)
POST   /api/documents/extract    → upload photo → extract data → return fields

# Chat
WS     /api/ws/chat              → WebSocket streaming chat endpoint
```

### Appliance Router

```python
# backend/app/routers/appliances.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.appliance import ApplianceCreate, ApplianceUpdate, ApplianceResponse
from app.services.appliance_service import ApplianceService

router = APIRouter()

@router.get("/", response_model=list[ApplianceResponse])
async def list_appliances(db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    return await service.get_all_appliances(user_id=1)  # single user in phase 1

@router.post("/", response_model=ApplianceResponse, status_code=201)
async def create_appliance(
    data: ApplianceCreate,
    db: AsyncSession = Depends(get_db)
):
    service = ApplianceService(db)
    return await service.create_appliance(user_id=1, data=data)

@router.get("/{appliance_id}", response_model=ApplianceResponse)
async def get_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    appliance = await service.get_appliance(appliance_id)
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    return appliance

@router.put("/{appliance_id}", response_model=ApplianceResponse)
async def update_appliance(
    appliance_id: int,
    data: ApplianceUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = ApplianceService(db)
    return await service.update_appliance(appliance_id, data)

@router.delete("/{appliance_id}", status_code=204)
async def delete_appliance(appliance_id: int, db: AsyncSession = Depends(get_db)):
    service = ApplianceService(db)
    await service.delete_appliance(appliance_id)
```

### Pydantic Schemas

```python
# backend/app/schemas/appliance.py
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from enum import Enum

class ApplianceCategory(str, Enum):
    hvac          = "hvac"
    refrigerator  = "refrigerator"
    dishwasher    = "dishwasher"
    washer        = "washer"
    dryer         = "dryer"
    oven          = "oven"
    water_heater  = "water_heater"
    other         = "other"

class WarrantyStatus(str, Enum):
    active          = "active"
    expiring_soon   = "expiring_soon"
    expired         = "expired"
    no_warranty     = "no_warranty"

class WarrantyCreate(BaseModel):
    warranty_type:       Optional[str] = "manufacturer"
    start_date:          Optional[date] = None
    expiry_date:         date
    coverage_summary:    Optional[str] = None
    what_is_covered:     Optional[str] = None
    what_is_not_covered: Optional[str] = None
    claim_phone:         Optional[str] = None
    claim_url:           Optional[str] = None
    claim_email:         Optional[str] = None
    provider_name:       Optional[str] = None
    notes:               Optional[str] = None

class WarrantyResponse(WarrantyCreate):
    id:               int
    appliance_id:     int
    warranty_status:  WarrantyStatus
    days_remaining:   Optional[int] = None

class ApplianceCreate(BaseModel):
    name:               str
    category:           ApplianceCategory
    brand:              Optional[str] = None
    model_number:       Optional[str] = None
    serial_number:      Optional[str] = None
    purchase_date:      Optional[date] = None
    purchase_price:     Optional[float] = None
    purchase_retailer:  Optional[str] = None
    location:           Optional[str] = None
    notes:              Optional[str] = None
    warranty:           Optional[WarrantyCreate] = None  # included in same request

class ApplianceUpdate(BaseModel):
    name:              Optional[str] = None
    brand:             Optional[str] = None
    model_number:      Optional[str] = None
    serial_number:     Optional[str] = None
    purchase_date:     Optional[date] = None
    purchase_price:    Optional[float] = None
    purchase_retailer: Optional[str] = None
    location:          Optional[str] = None
    notes:             Optional[str] = None

class ApplianceResponse(BaseModel):
    id:                int
    name:              str
    category:          str
    brand:             Optional[str]
    model_number:      Optional[str]
    serial_number:     Optional[str]
    purchase_date:     Optional[date]
    purchase_price:    Optional[float]
    purchase_retailer: Optional[str]
    location:          Optional[str]
    notes:             Optional[str]
    age_years:         Optional[float]
    warranty:          Optional[WarrantyResponse]
    created_at:        datetime

    class Config:
        from_attributes = True
```

### WebSocket Chat Endpoint

```python
# backend/app/routers/chat.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.agents.runner import stream_agent_response
import json

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_message = data.get("message", "")

            # Stream all ADK events to the frontend
            async for event in stream_agent_response(user_message):
                await websocket.send_json(event)

            # Signal response is complete
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
```

---

## 7. MCP Servers

Two independent Python processes. Each exposes tools that the agents call via MCP protocol.

### Appliance MCP Server

Includes **Skill 4 — Age Awareness**: all tools return `age_status` and `lifespan_used_pct` so the Explain Agent can surface age warnings automatically.

```python
# backend/mcp_servers/appliance_server.py
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
def list_all_appliances(user_id: int = 1) -> str:
    """
    Returns all appliances with age, age_status (good/warning/critical),
    lifespan_used_pct, and warranty_status. Used by Explain Agent for
    listing and age awareness (Skill 4).
    """
    conn = get_connection()
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
                      age_status: str = None, user_id: int = 1) -> str:
    """
    Filter appliances by category, warranty_status, or age_status.
    age_status options: good | warning | critical
    """
    all_appliances = json.loads(list_all_appliances(user_id))
    results = all_appliances
    if category:
        results = [a for a in results if a.get("category") == category]
    if warranty_status:
        results = [a for a in results if a.get("warranty_status") == warranty_status]
    if age_status:
        results = [a for a in results if a.get("age_status") == age_status]
    return json.dumps(results, default=str)

@mcp.tool()
def get_home_summary(user_id: int = 1) -> str:
    """
    Full home summary: appliance counts, warranty breakdown, age breakdown.
    """
    all_appliances = json.loads(list_all_appliances(user_id))
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
```

### Warranty MCP Server

```python
# backend/mcp_servers/warranty_server.py
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
def get_expiring_warranties(days_ahead: int = 90, user_id: int = 1) -> str:
    """
    Returns all warranties expiring within the specified number of days.
    Default is 90 days.
    """
    conn = get_connection()
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
def get_all_warranty_statuses(user_id: int = 1) -> str:
    """
    Returns warranty status for every registered appliance.
    Useful for answering 'which appliances are out of warranty?'
    """
    conn = get_connection()
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

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

## 8. Agent Layer — Google ADK

### How ADK Expresses Multi-Agent Systems

ADK uses a simple, clean hierarchy:
- `Agent` — one agent with a name, instruction, model, and tools
- Sub-agents are assigned to the parent's `sub_agents` list
- The Supervisor automatically routes to sub-agents based on their descriptions and instructions
- MCP tools are loaded natively via `MCPToolset` — no adapter library needed
- Sessions and conversation state are managed by ADK's built-in `InMemorySessionService`

### Full ADK Agent Definition

```python
# backend/app/agents/supervisor.py
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters

# --- MCP Tool connections ---

appliance_tools = MCPToolset(
    connection_params=StdioServerParameters(
        command="python",
        args=["mcp_servers/appliance_server.py"]
    )
)

warranty_tools = MCPToolset(
    connection_params=StdioServerParameters(
        command="python",
        args=["mcp_servers/warranty_server.py"]
    )
)

# --- Explain Agent ---
# Handles: appliance details, listing, filtering, age awareness, expiry countdown

explain_agent = Agent(
    name="explain_agent",
    model="gemini-2.0-flash",
    description="Handles questions about appliance details, age, brand, model, "
                "location, count, and home summaries. Also proactively surfaces "
                "age warnings (Skill 4) and warranty expiry countdowns (Skill 2).",
    instruction="""
You are the Explain Agent for HomeIQ. Help homeowners understand their registered appliances.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- list_all_appliances: when asked about all appliances, counts, or lists
- get_appliance_detail: when asked about a specific appliance
- filter_appliances: for filtered questions ("which are oldest?", "show HVAC only")
- get_home_summary: for overall home overview questions

Skill 2 — Warranty Expiry Countdown (automatic):
After describing any appliance, check its warranty_status from the tool result.
- "expiring_soon" (days_remaining ≤ 90): add ⚠️ with exact days remaining
- "expired": clearly state when it expired
- "no_warranty": gently note no warranty is registered
Do this even if the user did not ask about warranty.

Skill 3 — Suggested Questions (always):
After every response, include a JSON block on its own line:
{"suggested_questions": ["short question 1", "short question 2", "short question 3"]}
Base suggestions on what you just answered. Keep each question under 8 words.

Skill 4 — Age Awareness (automatic):
Check age_status from tool results.
- "critical" (past avg lifespan): add 🔴 with age and average lifespan for context
- "warning" (75%+ of lifespan used): add ⚠️ flag
Example: "🔴 Water Heater is 11 years old — past the average 10-year lifespan."

Do NOT include warranty coverage details — that belongs to the Warranty Agent.
""",
    tools=[appliance_tools],
)

# --- Warranty Agent ---
# Handles: warranty status, expiry, claim contacts, health score

warranty_agent = Agent(
    name="warranty_agent",
    model="gemini-2.0-flash",
    description="Handles questions about warranty coverage, expiry dates, claim "
                "contacts, and what is or is not covered. Also calculates the "
                "Home Health Score (Skill 1) when asked about home summaries.",
    instruction="""
You are the Warranty Agent for HomeIQ. Help homeowners understand their warranty coverage.

Use your tools to answer accurately. Never guess — always call a tool first.

Tool usage:
- check_warranty_status: for questions about a specific appliance's warranty
- get_all_warranty_statuses: for "which are covered?" or "which expired?" questions
- get_expiring_warranties: for expiry timeline questions
- get_claim_contact: when the user needs to file a claim

Skill 1 — Home Health Score:
When asked for a home summary, health check, or "what needs attention",
call calculate_home_health_score and present:
  1. Score and grade (e.g. "61/100 — Grade C")
  2. What is good (✅ items)
  3. What needs attention (⚠️ and 🔴 items)
Be specific and actionable.

Skill 3 — Suggested Questions (always):
After every response, include a JSON block on its own line:
{"suggested_questions": ["short question 1", "short question 2", "short question 3"]}
Base suggestions on what you just answered. Keep each question under 8 words.

Always state: active / expiring soon / expired / no warranty.
Always mention days remaining or since expiry.
Include claim contact info when relevant.
""",
    tools=[warranty_tools],
)

# --- Supervisor (Root Agent) ---

supervisor_agent = Agent(
    name="supervisor",
    model="gemini-2.0-flash",
    description="HomeIQ home management supervisor. Routes questions to the right specialist.",
    instruction="""
You are the HomeIQ supervisor. Route user questions to the correct specialist agent.

Routing rules:
- Appliance details, age, brand, model, count, list → explain_agent
- Warranty coverage, expiry, claims, what's covered → warranty_agent
- Questions needing BOTH (e.g. "tell me about my AC and its warranty") →
  call BOTH agents and combine their responses into one natural answer
- Home health, summary, what needs attention →
  call BOTH agents (explain for appliance data, warranty for health score)
- Greetings or unclear questions → respond directly or ask for clarification

When combining both agents' responses:
- Do not repeat information
- Flow naturally — never say "According to the Explain Agent..."
- Appliance details first, warranty status second
- Keep it concise but complete

If the question is too vague (e.g. "Am I covered?" with no appliance named),
ask which appliance they mean before routing.
""",
    sub_agents=[explain_agent, warranty_agent],
)
```

### ADK Runner — Streaming to WebSocket

```python
# backend/app/agents/runner.py
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from app.agents.supervisor import supervisor_agent
import json

session_service = InMemorySessionService()
runner = Runner(
    agent=supervisor_agent,
    app_name="homeiq",
    session_service=session_service
)

APP_NAME   = "homeiq"
USER_ID    = "user_001"
SESSION_ID = "session_001"

async def stream_agent_response(user_message: str):
    """
    Async generator — streams ADK events to the WebSocket handler.
    Yields dicts: {type, content} matching the frontend event protocol.
    """
    await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=user_message)]
    )

    tool_labels = {
        "list_all_appliances":        "Fetching your appliances...",
        "get_appliance_detail":        "Looking up appliance details...",
        "filter_appliances":           "Filtering appliances...",
        "get_home_summary":            "Building your home summary...",
        "check_warranty_status":       "Checking warranty status...",
        "get_expiring_warranties":     "Checking expiring warranties...",
        "get_all_warranty_statuses":   "Reviewing all warranties...",
        "get_claim_contact":           "Finding claim contact...",
        "calculate_home_health_score": "Calculating home health score...",
    }

    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=SESSION_ID,
        new_message=content
    ):
        # Stream text tokens
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    text = part.text
                    suggested = []

                    # Extract suggested_questions JSON if present
                    if '{"suggested_questions"' in text:
                        try:
                            idx = text.index('{"suggested_questions"')
                            json_str = text[idx:]
                            parsed = json.loads(json_str)
                            suggested = parsed.get("suggested_questions", [])
                            text = text[:idx].strip()
                        except Exception:
                            pass

                    if text:
                        yield {"type": "token", "content": text}
                    if suggested:
                        yield {"type": "suggested_questions", "questions": suggested}

        # Tool call started
        if hasattr(event, "tool_calls") and event.tool_calls:
            for tc in event.tool_calls:
                label = tool_labels.get(tc.name, "Working...")
                yield {"type": "tool_start", "tool_name": tc.name, "label": label}

        # Tool call finished
        if hasattr(event, "tool_responses") and event.tool_responses:
            yield {"type": "tool_end"}

        if event.is_final_response():
            return
```

---

## 9. Frontend — React

### Key Pages

**1. Profile Setup (`/profile`)**
- Simple form: Full Name, Address, City, State, Zip Code
- Shown on first launch, skippable
- Stored via `POST /api/profile`

**2. Appliance List (`/appliances`)**
- Grid of appliance cards
- Each card shows: name, brand, category icon, age, warranty status badge
- Warranty badge colors: green (active), amber (expiring soon), red (expired), gray (no warranty)
- "Add Appliance" button → navigates to `/appliances/add`
- Click card → navigate to detail/edit view

**3. Add Appliance (`/appliances/add`)**
- Two tabs: "Enter Manually" and "Upload Invoice"
- Manual tab: all appliance fields + warranty fields in one form
- Upload tab: drag-and-drop or file picker for invoice photo
- After upload: loading state → extracted fields displayed pre-filled → user confirms/edits → saves

**4. Edit Appliance (`/appliances/:id/edit`)**
- Same form as Add, pre-filled with existing data
- Delete button with confirmation dialog

**5. Chat (`/chat`)**
- Full-page chat interface
- Message history with user and assistant bubbles
- Streaming: assistant message appears token by token
- Tool call indicator: "Checking appliance details..." shown while tool runs
- Input box at bottom with send button
- Suggested quick questions on first load:
  - "List all my appliances"
  - "Which appliances are under warranty?"
  - "Give me a home summary"

### WarrantyBadge Component

```tsx
// frontend/src/components/appliances/WarrantyBadge.tsx
type WarrantyStatus = "active" | "expiring_soon" | "expired" | "no_warranty"

interface Props {
  status: WarrantyStatus
  daysRemaining?: number
}

export function WarrantyBadge({ status, daysRemaining }: Props) {
  const config = {
    active: {
      label: "Under Warranty",
      className: "bg-green-100 text-green-800"
    },
    expiring_soon: {
      label: `Expires in ${daysRemaining}d`,
      className: "bg-amber-100 text-amber-800"
    },
    expired: {
      label: "Warranty Expired",
      className: "bg-red-100 text-red-800"
    },
    no_warranty: {
      label: "No Warranty",
      className: "bg-gray-100 text-gray-600"
    }
  }

  const { label, className } = config[status]
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${className}`}>
      {label}
    </span>
  )
}
```

### useWebSocket Hook

```tsx
// frontend/src/hooks/useWebSocket.ts
import { useState, useRef, useCallback } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  suggestedQuestions?: string[]   // Skill 3 — populated when ADK sends suggested_questions event
}

export function useWebSocket() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [isStreaming, setIsStreaming]  = useState(false)
  const [activeTool, setActiveTool]   = useState<string | null>(null)
  const streamBuffer                  = useRef("")
  const pendingSuggestions            = useRef<string[]>([])
  const ws                            = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    ws.current = new WebSocket("ws://localhost:8000/api/ws/chat")

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "token") {
        // Accumulate streamed tokens into the last assistant message
        streamBuffer.current += data.content
        setMessages(prev => {
          const updated = [...prev]
          if (updated.at(-1)?.role === "assistant") {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: streamBuffer.current
            }
          } else {
            updated.push({ role: "assistant", content: streamBuffer.current })
          }
          return updated
        })
      } else if (data.type === "suggested_questions") {
        // Skill 3 — hold suggestions until "done" event so we attach to final message
        pendingSuggestions.current = data.questions
      } else if (data.type === "tool_start") {
        // Show human-readable label while tool runs
        setActiveTool(data.label || "Working...")
      } else if (data.type === "tool_end") {
        setActiveTool(null)
      } else if (data.type === "done") {
        // Attach suggested questions to the completed assistant message
        const suggestions = pendingSuggestions.current
        if (suggestions.length > 0) {
          setMessages(prev => {
            const updated = [...prev]
            if (updated.at(-1)?.role === "assistant") {
              updated[updated.length - 1].suggestedQuestions = suggestions
            }
            return updated
          })
        }
        // Reset state for next message
        setIsStreaming(false)
        setActiveTool(null)
        streamBuffer.current = ""
        pendingSuggestions.current = []
      }
    }

    ws.current.onerror = () => {
      setIsStreaming(false)
      setActiveTool(null)
    }
  }, [])

  const sendMessage = useCallback((message: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      connect()
    }
    setIsStreaming(true)
    setMessages(prev => [...prev, { role: "user", content: message }])
    ws.current?.send(JSON.stringify({ message }))
  }, [connect])

  return { messages, isStreaming, activeTool, sendMessage, connect }
}
```

---

## 10. Invoice Photo Extraction — Gemini Vision

This is the "magic" feature of Phase 1. User uploads a photo of their invoice or warranty card — Gemini extracts all the structured data automatically.

### Extraction Service

```python
# backend/app/services/extraction.py
import google.generativeai as genai
from PIL import Image
import json
import io
from app.core.config import settings

# Configure Gemini with Google AI Studio API key
genai.configure(api_key=settings.GEMINI_API_KEY)

# Gemini 2.0 Flash handles both text reasoning and image understanding
# No separate vision model needed — same model, same API key
model = genai.GenerativeModel("gemini-2.0-flash")

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
    Sends invoice image to Gemini 2.0 Flash (multimodal).
    Returns structured appliance + warranty fields.
    Uses generate_content_async to avoid blocking FastAPI's event loop.
    """
    image = Image.open(io.BytesIO(image_bytes))

    # Use async call — critical inside FastAPI async endpoints
    response = await model.generate_content_async([EXTRACTION_PROMPT, image])
    raw_text = response.text.strip()

    # Strip markdown code fences if Gemini adds them
    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        raw_text = parts[1] if len(parts) > 1 else raw_text
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]

    return json.loads(raw_text.strip())
```

### Document Upload Endpoint

```python
# backend/app/routers/documents.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.extraction import extract_from_invoice_image
import shutil
import os
from datetime import datetime

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/extract")
async def extract_invoice(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are supported (JPEG, PNG, WEBP)")

    # Read file bytes
    image_bytes = await file.read()

    # Save file locally
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    # Extract data using Gemini Vision
    extracted_data = await extract_from_invoice_image(image_bytes)
    extracted_data["invoice_image_path"] = filepath

    return {
        "success": True,
        "extracted": extracted_data,
        "image_path": filepath
    }
```

### Frontend — Invoice Upload Flow

```
User on "Add Appliance" page → clicks "Upload Invoice" tab
    ↓
Drag and drop zone or file picker (accepts image/*)
    ↓
File selected → preview thumbnail shown
    ↓
"Extract Details" button clicked
    ↓
POST /api/documents/extract (multipart form)
    ↓
Loading spinner: "Reading your invoice..."
    ↓
Extracted fields displayed in editable form:
  ✓ Brand: Carrier
  ✓ Model: 24ACC636A003
  ✓ Purchase Date: March 15, 2021
  ✓ Warranty Expires: March 15, 2026
  ✗ Serial Number: (not found — user can type)
    ↓
User reviews, edits any wrong fields, clicks "Save Appliance"
    ↓
POST /api/appliances → saved to SQLite
    ↓
Redirect to appliance list → new card visible
```

---

## 11. End-to-End Demo Flows

### Flow 1 — Single Agent (Explain) with Age Awareness

```
User: "How many appliances do I have?"

ADK Supervisor → recognises appliance listing question → routes to explain_agent
→ list_all_appliances(user_id=1) called
→ Returns 4 appliances with age_status and warranty_status fields

Response (streamed):
"You have 4 appliances registered:

1. Carrier AC — 4 years old | Basement | ✅ Warranty active
2. Bosch Dishwasher — 5 years old | Kitchen | ⚠️ Warranty expired
3. LG Refrigerator — 2 years old | Kitchen | ✅ Warranty active
4. Rheem Water Heater — 11 years old | Basement | 🔴 Past average lifespan (10 yrs)"

{"suggested_questions": ["Tell me about my water heater", "Which warranty expires soonest?", "Home health score?"]}
```

### Flow 2 — Single Agent (Warranty)

```
User: "Which of my appliances don't have warranty anymore?"

ADK Supervisor → recognises warranty coverage question → routes to warranty_agent
→ get_all_warranty_statuses(user_id=1) called
→ Returns statuses for all 4 appliances

Response:
"Your Bosch Dishwasher's warranty expired in January 2023 — about 2 years ago.

Your other 3 appliances are still covered:
• Carrier AC — active until March 2026
• LG Refrigerator — active until November 2027
• Rheem Water Heater — no warranty registered"

{"suggested_questions": ["What does my AC warranty cover?", "How do I file a claim?", "Home health score?"]}
```

### Flow 3 — Multi Agent (Explain + Warranty)

```
User: "Tell me everything about my AC"

Supervisor:
  intents: ["explain", "warranty"]
  appliance_hint: "AC"

→ ADK Supervisor routes to both Explain Agent AND Warranty Agent
→ Explain Agent: get_appliance_detail(appliance_id=1)
→ Warranty Agent: check_warranty_status(appliance_id=1)
→ Supervisor merges both responses into one natural answer

Merged Response (streamed):
"Your Carrier AC (Model 24ACC636A003) is installed in the Basement
and was purchased from Home Depot in March 2021 — making it just
over 4 years old. You paid $2,499 for it.

It's currently under warranty until March 15, 2026, with about
9 months remaining. The warranty covers parts and labor.
If you need to file a claim, you can reach Carrier at
1-800-227-7437 or carrier.com/warranty."
```

### Flow 4 — Clarification Needed

```
User: "Am I covered?"

ADK Supervisor → question too vague, no appliance specified → responds directly

Response:
"Which appliance are you asking about? You have:
• Carrier AC
• Bosch Dishwasher
• LG Refrigerator
• Rheem Water Heater"

{"suggested_questions": ["Is my AC under warranty?", "Check dishwasher warranty", "Show all warranty statuses"]}
```

---

## 12. Week-by-Week Execution Plan

### Week 1 — Project Setup & Database

**Backend**
- [ ] Initialize FastAPI project, install dependencies (FastAPI, SQLAlchemy, SQLite, Pydantic, etc.)
- [ ] Set up project directory structure (`backend/app`, `backend/mcp_servers`, etc.)
- [ ] Set up SQLite database connection with SQLAlchemy async engine (`database.py`)
- [ ] Create 3 database tables mapping to SQLAlchemy models (users, appliances, warranties)
- [ ] Write and run `init_db()` to automatically create tables on app startup
- [ ] Create Pydantic validation schemas for all requests/responses
- [ ] Create empty router files and stub all REST endpoints (returning 501 Not Implemented or empty data)
- [ ] Write a basic Python script or Pytest to verify creating and reading an appliance directly from SQLite

**Frontend**
- [ ] Initialize React + Vite + TypeScript template
- [ ] Install and configure Tailwind CSS and necessary UI components
- [ ] Set up React Router with 5 main routes (`/`, `/appliances`, `/appliances/add`, `/appliances/edit/:id`, `/chat`)
- [ ] Create main layout component featuring a sidebar navigation and top header
- [ ] Create placeholder page components for all 5 routes to ensure navigation works
- [ ] Set up Axios API client instance with base URL pointing to localhost:8000
- [ ] Define shared TypeScript interfaces/types matching backend schemas

**DevOps**
- [ ] Create `.env.example` and `.env` files for environment variables including `GEMINI_API_KEY`
- [ ] Configure `.gitignore` to exclude `homeiq.db`, `uploads/`, `venv/`, `node_modules/`, and `.env`
- [ ] Create a comprehensive `README.md` with step-by-step local setup instructions

---

### Week 2 — CRUD Endpoints + Manual Form

**Backend**
- [ ] Implement Home Profile REST endpoints (GET /api/profile, POST /api/profile, PUT /api/profile)
- [ ] Implement Appliance REST endpoints (GET /api/appliances, POST /api/appliances, GET /api/appliances/{id}, PUT /api/appliances/{id}, DELETE /api/appliances/{id})
- [ ] Integrate warranty creation logic inside the appliance creation endpoint
- [ ] Implement Python utility functions for computed fields (`get_warranty_status`, `get_appliance_age_years`)
- [ ] Ensure GET appliance endpoints return the computed warranty status and age dynamically
- [ ] Thoroughly test all implemented endpoints using tools like curl, Postman, or Swagger UI

**Frontend**
- [ ] Build Profile setup page with form fields for name, address, zip code, and a submit button
- [ ] Build manual "Add Appliance" form handling all required and optional appliance fields
- [ ] Implement a toggleable "Warranty Details" section within the "Add Appliance" form
- [ ] Wire up form submission to POST data to the API and redirect to the appliance list upon success
- [ ] Build Appliance List page to fetch and display appliances from the backend API
- [ ] Create reusable `ApplianceCard` and `WarrantyBadge` components for the list view
- [ ] Build "Edit Appliance" page that fetches existing data and pre-fills the form for updates
- [ ] Conduct end-to-end testing: manually add 2-3 appliances and verify they render correctly in the list

---

### Week 3 — Invoice Photo Upload + Gemini Vision

**Backend**
- [ ] Install `google-generativeai` and `Pillow` libraries
- [ ] Implement `extract_from_invoice_image(image_bytes)` service using Gemini 2.0 Flash multimodal capabilities
- [ ] Craft and refine the system prompt for Gemini to accurately extract specific appliance and warranty fields as JSON
- [ ] Implement `POST /api/documents/extract` endpoint to accept multipart file uploads
- [ ] Add error handling for extraction failures (e.g., blurry image, invalid file format) to return partial data gracefully
- [ ] Implement logic to save the uploaded photo to the local `uploads/` directory with a unique timestamped filename
- [ ] Test the extraction service using various real-world invoice and warranty card photos

**Frontend**
- [ ] Add an "Upload Invoice" tab/toggle in the "Add Appliance" page
- [ ] Implement a drag-and-drop zone component that accepts image files (`image/*`)
- [ ] Display an image preview thumbnail after the user selects a file
- [ ] Implement "Extract Details" button that triggers the POST request to `/api/documents/extract`
- [ ] Add loading state (spinner/text like "Reading your invoice...") while the API call is in progress
- [ ] Build `ExtractedDataConfirm` component to display the extracted fields in an editable form format
- [ ] Include visual indicators for the confidence level of each extracted field (if provided by the API)
- [ ] Wire the "Save Appliance" button from the confirmation screen to use the standard appliance creation endpoint
- [ ] Conduct end-to-end testing of the upload flow: select photo → view extracted data → modify if needed → save → verify in list

---

### Week 4 — MCP Servers

**Backend**
- [ ] Install `fastmcp` package
- [ ] Create the Appliance MCP Server (`appliance_server.py`) and initialize FastMCP
- [ ] Implement Appliance Server tools: `list_all_appliances`, `get_appliance_detail`, `filter_appliances`, and `get_home_summary`
- [ ] Ensure Appliance Server tools enrich data with age status and lifespan calculations (Skill 4)
- [ ] Create the Warranty MCP Server (`warranty_server.py`) and initialize FastMCP
- [ ] Implement Warranty Server tools: `check_warranty_status`, `get_expiring_warranties`, `get_claim_contact`, and `get_all_warranty_statuses`
- [ ] Add `calculate_home_health_score` tool to Warranty Server (Skill 1)
- [ ] Run both servers independently and test them using the MCP Inspector CLI
- [ ] Verify that all tools interact correctly with the SQLite database and return formatted JSON data

---

### Week 5 — Google ADK Agent Layer

**Backend**
- [ ] Install `google-adk` package
- [ ] Define the `explain_agent` in `supervisor.py` and configure it to connect to the Appliance MCP Server via `MCPToolset`
- [ ] Add system prompt instructions for `explain_agent` to handle Warranty Expiry Countdown (Skill 2)
- [ ] Define the `warranty_agent` in `supervisor.py` and configure it to connect to the Warranty MCP Server via `MCPToolset`
- [ ] Define the `supervisor_agent` configured to route tasks to `sub_agents=[explain_agent, warranty_agent]`
- [ ] Add system prompt instructions to all agents to append `{"suggested_questions": [...]}` to their responses (Skill 3)
- [ ] Create `runner.py` to initialize the ADK `Runner` using an `InMemorySessionService`
- [ ] Implement the `stream_agent_response(message)` async generator function in `runner.py` to yield parsed events (tokens, tool calls, JSON)
- [ ] Run `adk web` to launch the built-in trace viewer and verify agent reasoning paths
- [ ] Write a test script to execute direct Python calls covering various scenarios (single agent, multi-agent, clarification needed, and all 4 skills)

---

### Week 6 — WebSocket + Chat UI

**Backend**
- [ ] Implement WebSocket endpoint `/api/ws/chat` in `chat.py`
- [ ] Connect the WebSocket endpoint to the ADK `stream_agent_response()` generator from `runner.py`
- [ ] Ensure the server properly emits standard event types: `token`, `tool_start`, `tool_end`, `suggested_questions`, and `done`
- [ ] Implement robust error handling and disconnect management for the WebSocket connection
- [ ] Test the WebSocket connection independently using a tool like `wscat` or Postman

**Frontend**
- [ ] Build the main Chat page layout
- [ ] Implement message history display with distinct styling for User (right-aligned) and Assistant (left-aligned) bubbles
- [ ] Build the input box, send button, and "Enter to send" functionality
- [ ] Implement a custom `useWebSocket` React hook to manage connection state, sending messages, and receiving streamed events
- [ ] Create a `ToolCallIndicator` component (e.g., "Checking warranty status...") that displays dynamically when `tool_start` events arrive
- [ ] Implement streaming text rendering for Assistant bubbles as `token` events arrive
- [ ] Parse and display `suggested_questions` as clickable chips below the Assistant's response once the `done` event is received (Skill 3)
- [ ] Pre-populate the chat with an initial greeting and suggested quick questions on first load
- [ ] Test the full real-time conversation flow within the browser

---

### Week 7 — Integration + Polish

- [ ] Perform comprehensive end-to-end testing: add appliances via manual form and photo upload, then ask complex questions about them in the chat
- [ ] Implement edge case handling for empty states (e.g., agent says "You haven't added any appliances yet" if the DB is empty)
- [ ] Implement conversational clarification for ambiguous questions (e.g., agent asks "Which appliance are you asking about?")
- [ ] Add automatic WebSocket reconnection logic and display connection status in the UI
- [ ] Add loading states and skeleton loaders to the Appliance List and Profile pages
- [ ] Perform a basic mobile responsiveness check across all main views
- [ ] Refine UI aesthetics: ensure consistent spacing, typography, and color schemes across all components
- [ ] Add global error handling with toast notifications for failed API calls and connection issues

---

### Week 8 — Testing + Demo Prep

- [ ] Execute run-throughs of all 4 predefined demo scenarios to ensure flawless execution
- [ ] Seed the database with 5-6 sample appliances possessing varied warranty statuses (active, expiring soon, expired, none) and ages for an effective demo
- [ ] Update `README.md` with explicit instructions on how to start all services and run the demo flows
- [ ] Record a polished demo video walkthrough highlighting the core value propositions (photo upload, conversational querying, agent skills)
- [ ] Triage and fix any remaining minor bugs or UI glitches discovered during testing
- [ ] Perform a final local deployment test to verify stability for live presentations

---

## 13. Environment Setup

### Prerequisites

```
Python 3.12+
Node.js 18+
A Gemini API key from Google AI Studio (aistudio.google.com)
```

### Backend Setup

```bash
# Clone repo and navigate to backend
cd homeiq/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Run the API server
uvicorn app.main:app --reload --port 8000
```

### requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.0
pydantic-settings==2.6.0
sqlalchemy==2.0.36
aiosqlite==0.20.0
python-multipart==0.0.12
google-adk==0.4.0
google-generativeai==0.8.3
fastmcp==2.0.0
Pillow==11.0.0
python-dotenv==1.0.1
httpx==0.28.0
```

### .env file

```bash
# backend/.env

GEMINI_API_KEY=your_google_ai_studio_api_key_here

# App settings
UPLOAD_DIR=uploads
DATABASE_PATH=homeiq.db

# ADK tracing is built-in — no extra key needed
# Run: adk web   to open the trace viewer at http://localhost:8001
```

### Frontend Setup

```bash
cd homeiq/frontend

npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

### package.json (key dependencies)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.7",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "vite": "^5.4.10"
  }
}
```

### Running All Services

```bash
# Terminal 1 — Appliance MCP Server
cd homeiq/backend
python mcp_servers/appliance_server.py

# Terminal 2 — Warranty MCP Server
cd homeiq/backend
python mcp_servers/warranty_server.py

# Terminal 3 — FastAPI Backend
cd homeiq/backend
uvicorn app.main:app --reload --port 8000

# Terminal 4 — React Frontend
cd homeiq/frontend
npm run dev
# Opens at http://localhost:5173

# Optional Terminal 5 — ADK Trace Viewer (built into google-adk)
adk web
# Opens agent trace UI at http://localhost:8001
# No account or API key needed — traces all agent reasoning locally
```

---

## 14. What Phase 2 Will Add

Phase 1 is intentionally narrow. Here's what Phase 2 unlocks:

| Feature | Why Waiting for Phase 2 |
|---|---|
| **Bill tracking** | Needs its own agent + MCP server + UI screens |
| **PDF warranty document parsing** | Needs vector DB + RAG pipeline (ChromaDB + LlamaIndex) |
| **Proactive notifications + reminders** | Needs background scheduler (Celery) + email/SMS |
| **Contractor search + booking** | Needs external API (Yelp/Angi) |
| **User authentication** | Phase 1 is single-user demo; auth adds complexity |
| **Appliance failure risk scoring** | Needs historical data + ML model |
| **PostgreSQL migration** | When multi-user + auth comes in, SQLite gets replaced |
| **Embeddings + semantic search** | When PDF documents need to be queried semantically |

Phase 1 gives you a **real, working, demoable product** — data in, questions out, intelligent answers. That's the foundation everything else builds on.

---

*HomeIQ Phase 1 Implementation Plan*  
*Author: Shubham Chhimpa | Version 2.0 | June 2026*  
*Stack: React · FastAPI · SQLite · Google ADK · Gemini 2.0 Flash · FastMCP*  
*Key additions in v2.0: Google ADK replacing LangGraph · 4 Agent Skills added*
