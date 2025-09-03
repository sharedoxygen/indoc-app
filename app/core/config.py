"""
Configuration management for inDoc
"""
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, ConfigDict
from pathlib import Path
import os
import yaml


class Settings(BaseSettings):
    # Pydantic v2 config
    model_config = ConfigDict(env_file=[".env", "../.env"], case_sensitive=True, extra='ignore')

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
    ELASTICSEARCH_URL: str = Field(default="http://localhost:9200")
    ELASTICSEARCH_INDEX: str = Field(default="indoc_documents")
    
    # Weaviate  
    WEAVIATE_URL: str = Field(default="http://localhost:8060")
    WEAVIATE_CLASS: str = Field(default="Document")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379")
    
    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0")
    
    # Ollama
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="llama2")
    
    # Security
    JWT_SECRET_KEY: str = Field(default="")  # Will be set by key manager
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    
    # Encryption
    FIELD_ENCRYPTION_KEY: str = Field(default="")  # Will be set by key manager
    ENABLE_FIELD_ENCRYPTION: bool = True
    
    def __init__(self, **kwargs):
        # Merge YAML defaults and local overrides first
        yaml_config = {}
        try:
            with open(Path(__file__).resolve().parent.parent.parent / 'config' / 'default.yaml', 'r') as f:
                yaml_config = yaml.safe_load(f) or {}
            local_path = Path(__file__).resolve().parent.parent.parent / 'config' / 'local.yaml'
            if local_path.exists():
                local_cfg = yaml.safe_load(local_path.read_text()) or {}
                # shallow merge local over default
                def merge(a, b):
                    for k, v in (b or {}).items():
                        if isinstance(v, dict) and isinstance(a.get(k), dict):
                            merge(a[k], v)
                        else:
                            a[k] = v
                    return a
                yaml_config = merge(yaml_config, local_cfg)
        except Exception:
            yaml_config = yaml_config or {}

        # Map YAML into our fields if not provided via kwargs/env
        mapped = {}
        def g(path, default=None):
            cur = yaml_config
            for p in path:
                if not isinstance(cur, dict) or p not in cur: return default
                cur = cur[p]
            return cur
        mapped.update({
            'APP_NAME': g(['app','name'], self.APP_NAME if hasattr(self, 'APP_NAME') else 'inDoc'),
            'APP_VERSION': g(['app','version'], self.APP_VERSION if hasattr(self, 'APP_VERSION') else '1.0.0'),
            'API_PREFIX': g(['api','prefix'], self.API_PREFIX if hasattr(self, 'API_PREFIX') else '/api/v1'),
            'API_HOST': g(['server','host'], self.API_HOST if hasattr(self, 'API_HOST') else '0.0.0.0'),
            'API_PORT': g(['server','port'], self.API_PORT if hasattr(self, 'API_PORT') else 8000),
            'TEMP_REPO_PATH': Path(g(['storage','temp_path'], './tmp/indoc_temp')),
            'STORAGE_PATH': Path(g(['storage','storage_path'], './data/storage')),
            'CORS_ORIGINS': g(['cors','origins'], ["http://localhost:5173", "http://localhost:3000"]),
            'ELASTICSEARCH_URL': g(['search','elasticsearch_url'], 'http://localhost:9200'),
            'ELASTICSEARCH_INDEX': g(['search','elasticsearch_index'], 'indoc_documents'),
            'WEAVIATE_URL': g(['search','weaviate_url'], 'http://localhost:8060'),
            'WEAVIATE_CLASS': g(['search','weaviate_class'], 'Document'),
            'REDIS_URL': g(['redis','url'], 'redis://localhost:6379'),
            'CELERY_BROKER_URL': g(['celery','broker_url'], 'redis://localhost:6379/0'),
            'CELERY_RESULT_BACKEND': g(['celery','result_backend'], 'redis://localhost:6379/0'),
            'OLLAMA_BASE_URL': g(['ollama','base_url'], 'http://localhost:11434'),
            'OLLAMA_MODEL': g(['ollama','model'], 'llama2'),
        })

        # env/kwargs should override YAML
        mapped.update(kwargs)
        super().__init__(**mapped)
        # Initialize production keys if not provided
        self._initialize_production_keys()
    
    def _initialize_production_keys(self):
        """Initialize production-grade keys using key manager"""
        try:
            from app.core.key_management import get_production_keys
            
            production_keys = get_production_keys()
            
            # Set JWT secret if not provided via environment
            if not self.JWT_SECRET_KEY:
                self.JWT_SECRET_KEY = production_keys['jwt_secret_key']
            
            # Set field encryption key if not provided via environment  
            if not self.FIELD_ENCRYPTION_KEY:
                self.FIELD_ENCRYPTION_KEY = production_keys['field_encryption_key']
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize production keys: {e}")
            
            # Fallback to environment variables or generate temporary keys
            if not self.JWT_SECRET_KEY:
                self.JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.urandom(32).hex())
            if not self.FIELD_ENCRYPTION_KEY:
                from cryptography.fernet import Fernet
                import base64
                self.FIELD_ENCRYPTION_KEY = base64.urlsafe_b64encode(Fernet.generate_key()).decode()
    
    # Storage (no side effects here)
    TEMP_REPO_PATH: Path = Path("./tmp/indoc_temp")
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