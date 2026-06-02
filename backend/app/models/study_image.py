"""
Study Image model
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudyImage(Base):

    __tablename__ = "study_images"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    study_id = Column(
        Integer,
        ForeignKey(
            "studies.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    filename = Column(
        String,
        nullable=False,
    )

    file_path = Column(
        String,
        nullable=False,
    )

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationship
    study = relationship(
        "Study",
        back_populates="images",
    )