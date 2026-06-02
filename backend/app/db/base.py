"""
SQLAlchemy declarative base — all models must import from here.

IMPORTANT:
All models must be imported in this file so Alembic
can auto-detect them when generating migration scripts.
"""

from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """
        Auto-generate snake_case table name from class name.
        Example:
            UserProfile -> user_profile
        """
        import re

        name = cls.__name__
        s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


# ─────────────────────────────────────────────────────────────
# Import all model modules for SQLAlchemy metadata registration
# DO NOT import model classes directly to avoid circular imports
# ─────────────────────────────────────────────────────────────

from app.models import (  # noqa: F401,E402
    user,
    patient,
    appointment,
    study,
    report,
)