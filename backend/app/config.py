import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


logger = logging.getLogger(__name__)

_WEAK_SECRET_VALUES = {
    "",
    "changeme",
    "change-me",
    "secret",
    "your-secret-key",
    "your-super-secret-key-change-in-production",
    "dev-insecure-secret-change-me",
}


class Settings(BaseSettings):
    # App
    app_name: str = "Fiscally API"
    debug: bool = False
    environment: str = "development"
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/fiscally"
    
    # JWT
    secret_key: str = "dev-insecure-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def validate_secret_key_strength(self) -> "Settings":
        key = (self.secret_key or "").strip()
        key_lower = key.lower()
        weak = (
            len(key) < 32
            or key_lower in _WEAK_SECRET_VALUES
            or "change-in-production" in key_lower
        )
        is_non_dev = self.environment not in {"development", "dev", "local", "test"}
        if is_non_dev and weak:
            raise ValueError(
                "SECRET_KEY is weak/default-like for non-development environment. "
                "Set a strong random SECRET_KEY before starting the server."
            )
        if not is_non_dev and weak:
            logger.warning(
                "Using weak/default SECRET_KEY in %s mode. This is allowed only for local development.",
                self.environment,
            )
        return self
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
