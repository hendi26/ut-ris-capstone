"""
Appointment model — jadwal pemeriksaan radiologi.

Alur:
Appointment (terjadwal)
    ↓
Study (dilaksanakan)
    ↓
Report (dilaporkan)

Satu appointment menghasilkan tepat satu study setelah dilaksanakan.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base_model import TimestampMixin

if TYPE_CHECKING:
    from app.models.patient import Patient
    from app.models.user import User
    from app.models.study import Study


class AppointmentStatus(str, enum.Enum):
    """Status janji pemeriksaan."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class AppointmentPriority(str, enum.Enum):
    """Prioritas jadwal."""

    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class Appointment(TimestampMixin, Base):
    """
    Jadwal pemeriksaan radiologi.
    Dibuat oleh resepsionis atas permintaan dokter.
    """

    __tablename__ = "appointments"

    # ─────────────────────────────────────────────────────────────
    # Primary Key
    # ─────────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ─────────────────────────────────────────────────────────────
    # Identifikasi
    # ─────────────────────────────────────────────────────────────
    appointment_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )

    # ─────────────────────────────────────────────────────────────
    # Foreign Keys
    # ─────────────────────────────────────────────────────────────
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    referring_doctor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_by_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ─────────────────────────────────────────────────────────────
    # Detail Jadwal
    # ─────────────────────────────────────────────────────────────
    requested_modality: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    body_part: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    clinical_indication: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    preparation_instructions: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # ─────────────────────────────────────────────────────────────
    # Waktu
    # ─────────────────────────────────────────────────────────────
    scheduled_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    estimated_duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
    )

    # ─────────────────────────────────────────────────────────────
    # Status & Prioritas
    # ─────────────────────────────────────────────────────────────
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointmentstatus"),
        default=AppointmentStatus.PENDING,
        nullable=False,
        index=True,
    )

    priority: Mapped[AppointmentPriority] = mapped_column(
        Enum(AppointmentPriority, name="appointmentpriority"),
        default=AppointmentPriority.ROUTINE,
        nullable=False,
    )

    # ─────────────────────────────────────────────────────────────
    # Catatan
    # ─────────────────────────────────────────────────────────────
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    checked_in_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─────────────────────────────────────────────────────────────
    # Relationships
    # ─────────────────────────────────────────────────────────────
    patient: Mapped["Patient"] = relationship(
        "Patient",
        back_populates="appointments",
    )

    referring_doctor: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[referring_doctor_id],
        back_populates="referred_appointments",
    )

    created_by: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="created_appointments",
    )

    study: Mapped[Optional["Study"]] = relationship(
        "Study",
        back_populates="appointment",
        uselist=False,
    )

    # ─────────────────────────────────────────────────────────────
    # Composite Indexes
    # ─────────────────────────────────────────────────────────────
    __table_args__ = (
        Index(
            "ix_appointments_patient_status",
            "patient_id",
            "status",
        ),
        Index(
            "ix_appointments_scheduled_datetime",
            "scheduled_datetime",
        ),
        Index(
            "ix_appointments_status_priority",
            "status",
            "priority",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Appointment "
            f"id={self.id} "
            f"number={self.appointment_number} "
            f"patient_id={self.patient_id} "
            f"status={self.status}>"
        )