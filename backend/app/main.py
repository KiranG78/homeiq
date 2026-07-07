from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager, AsyncExitStack
import opentelemetry.context.contextvars_context as cv_context
from loguru import logger
import sys

# Monkey-patch OpenTelemetry to prevent crash on cross-context generator cleanup
original_detach = cv_context.ContextVarsRuntimeContext.detach
def safe_detach(self, token):
    try:
        original_detach(self, token)
    except ValueError:
        pass
cv_context.ContextVarsRuntimeContext.detach = safe_detach

from app.database import init_db
from app.routers import profile, appliances, documents, chat, bills, smart_scan, dashboard
from app.agents.runner import init_runner

# Configure loguru
logger.remove()
logger.add(sys.stderr, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized.")
    
    logger.info("Initializing MCP Tools and Agents...")
    exit_stack = AsyncExitStack()
    await init_runner(exit_stack)
    logger.info("Agents initialized.")
    
    from app.scheduler import init_scheduler
    init_scheduler()
    
    yield
    
    logger.info("Shutting down...")
    await exit_stack.aclose()

app = FastAPI(title="HomeIQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(appliances.router, prefix="/api/appliances", tags=["Appliances"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])
app.include_router(smart_scan.router, prefix="/api/smart-scan", tags=["Smart Scan"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

from fastapi.staticfiles import StaticFiles
from app.core.config import settings

# Mount uploads directory so frontend can fetch images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "HomeIQ API is running"}

