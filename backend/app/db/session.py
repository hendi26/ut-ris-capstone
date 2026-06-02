"""
Database session factory — async SQLAlchemy engine and session.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# Ensure the URL uses the asyncpg driver
database_url = settings.DATABASE_URL

# Render.com sends postgres:// — normalize to postgresql://
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

if database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1,
    )

# SQLite does not support pool_size/max_overflow
if database_url.startswith("sqlite"):
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
    )
else:
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)