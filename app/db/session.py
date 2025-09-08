"""
Database session management
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.core.config import settings

# Async engine for main application with optimized pooling
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,  # Increased from 10
    max_overflow=40,  # Increased from 20
    pool_timeout=30,
    pool_recycle=3600,  # Recycle connections every hour
    connect_args={
        "server_settings": {
            "application_name": "indoc_app",
            "jit": "off"  # Disable JIT for faster query planning
        }
    }
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync engine for migrations and scripts
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True
)

# Sync session factory
SessionLocal = sessionmaker(
    sync_engine,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db():
    """Dependency to get a synchronous database session (for sync services)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()