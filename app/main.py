"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import async_engine
from app.models.base import Base
from app.middleware.audit import AuditMiddleware
from app.middleware.telemetry import TelemetryMiddleware
from app.core.monitoring import metrics_endpoint
# from app.api.v1.endpoints import chat, bulk_upload  # Temporarily disabled
from app.middleware.timeout import RequestTimeoutMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiting import RateLimitMiddleware, rate_limiter
from app.core.cache import cache_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting inDoc application...")

    # Ensure storage directories exist (moved from settings validator)
    try:
        settings.TEMP_REPO_PATH.mkdir(parents=True, exist_ok=True)
        settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to initialize storage directories: {e}")
        raise
    
    # Initialize cache service
    await cache_service.connect()
    
    # Create database tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down inDoc application...")
    await cache_service.disconnect()
    await async_engine.dispose()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure for production
)

# Add custom middleware
app.add_middleware(AuditMiddleware)
if settings.ENABLE_TELEMETRY:
    app.add_middleware(TelemetryMiddleware)
app.add_middleware(RequestTimeoutMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, limiter=rate_limiter)

# Include API router
app.include_router(api_router, prefix=settings.API_PREFIX)

# Prometheus metrics endpoint
app.add_api_route(f"{settings.API_PREFIX}/metrics", metrics_endpoint, methods=["GET"], tags=["Monitoring"])

# Include WebSocket endpoints - temporarily disabled
# app.include_router(chat.router, prefix=f"{settings.API_PREFIX}/chat", tags=["chat"])
# app.include_router(bulk_upload.router, prefix=f"{settings.API_PREFIX}/files", tags=["bulk_upload"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api_docs": f"{settings.API_PREFIX}/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }

# Test endpoint
@app.get("/test-auth")
async def test_auth():
    return {"message": "Test endpoint working", "status": "ok"}


# Global exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP {exc.status_code} for {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={
        "detail": exc.detail,
        "status_code": exc.status_code,
        "path": request.url.path
    })


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Serialize validation errors without non-serializable data
    serialized_errors = []
    for err in exc.errors():
        serialized_errors.append({
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type")
        })
    return JSONResponse(status_code=422, content={
        "detail": serialized_errors,
        "path": request.url.path
    })


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error for {request.method} {request.url.path}")
    return JSONResponse(status_code=500, content={
        "detail": "Internal Server Error",
        "path": request.url.path
    })