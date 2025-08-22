"""
Configuration management for inDoc
"""
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, ConfigDict
from pathlib import Path


class Settings(BaseSettings):
    # Pydantic v2 config
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra='ignore')

    # Application
    APP_NAME: str = "inDoc"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "indoc"
    POSTGRES_USER: str = "indoc_user"
    POSTGRES_PASSWORD: str = "indoc_dev_password"
    
    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_INDEX: str = "indoc_documents"
    
    # Weaviate
    WEAVIATE_URL: str = "http://localhost:8080"
    WEAVIATE_CLASS: str = "Document"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0")
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"
    
    # Security
    JWT_SECRET_KEY: str = Field(default="change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    
    # Encryption
    FIELD_ENCRYPTION_KEY: str = Field(default="")
    ENABLE_FIELD_ENCRYPTION: bool = True
    
    # Storage (no side effects here)
    TEMP_REPO_PATH: Path = Path("/tmp/indoc_temp")
    STORAGE_PATH: Path = Path("./data/storage")
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf", "docx", "xlsx", "pptx", "txt", "html", 
        "xml", "json", "eml", "png", "jpg", "jpeg", "tiff"
    ]
    
    # Email Ingestion
    EMAIL_IMAP_SERVER: Optional[str] = None
    EMAIL_IMAP_PORT: int = 993
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    
    # Observability
    ENABLE_TELEMETRY: bool = True
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    DATADOG_API_KEY: Optional[str] = None
    GRAFANA_CLOUD_API_KEY: Optional[str] = None
    
    # Compliance
    AUDIT_LOG_RETENTION_DAYS: int = 2555  # 7 years
    ENABLE_AUDIT_LOGGING: bool = True
    
    # Performance
    SEARCH_TIMEOUT_MS: int = 200
    RERANK_TIMEOUT_MS: int = 100
    LLM_TIMEOUT_S: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @field_validator("TEMP_REPO_PATH", "STORAGE_PATH", mode="before")
    @classmethod
    def ensure_path_type(cls, v):
        # Only convert to Path, do not create directories here
        return Path(v)


settings = Settings()