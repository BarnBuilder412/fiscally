from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Fiscally"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    
    # Tavily
    TAVILY_API_KEY: str = ""
    
    # Mock Mode (for demo without real APIs)
    MOCK_MODE: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
