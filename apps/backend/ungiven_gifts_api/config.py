from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Leave empty to run against an in-memory store (handy for local dev and tests).
    mongodb_uri: str = ""
    mongodb_db: str = "ungiven_gifts"

    # Used to sign participant session tokens. Override in every deployed environment.
    secret_key: str = "dev-secret-change-me"
    session_ttl_days: int = 120

    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
