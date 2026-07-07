import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_PROVIDER: str = "CLAUDE"
    UPLOAD_DIR: str = "uploads"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CLAUDE_MODEL: str = "claude-haiku-4-5"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure ADK / Gemini SDK can find the API key in the environment
if settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

# Ensure uploads directory exists for image extraction
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
