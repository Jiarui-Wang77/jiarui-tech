from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    REDIS_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    GITHUB_TOKEN: str | None = None

    # M5 — Juno-Alpha LLM config (DeepSeek — used for streaming chat)
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "deepseek-chat"
    LLM_BASE_URL: str = "https://api.deepseek.com/v1"
    LLM_FREE_DAILY_LIMIT: int = 30
    LLM_MAX_HISTORY_TURNS: int = 20  # how many prior turns to send as context

    # Anthropic Claude — used for AI post generation (complete_chat)
    # Qwen (DashScope) — used for AI post generation & article processing
    QWEN_API_KEY: str = ""
    QWEN_MODEL: str = "qwen3-plus"          # DashScope model ID for Qwen3 Plus

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # Set True only after HTTPS / SSL certificate is configured on the server.
    # Secure cookies are NOT sent over plain HTTP — keep False until SSL is ready.
    COOKIE_SECURE: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
