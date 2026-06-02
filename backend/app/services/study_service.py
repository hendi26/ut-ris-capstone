"""
Study service — business logic for radiology study management.
"""

import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study import (
    Study,
    StudyStatus,
    Modality,
)

from app.models.appointment import AppointmentStatus
from app.models.user import User

from app.repositories.study_repository import (
    StudyRepository,
)

from app.repositories.appointment_repository import (
    AppointmentRepository,
)

from app.schemas.study import (
    StudyCreate,
    StudyUpdate,
    StudyResponse,
    StudyListResponse,
)


class StudyService:

    def __init__(self, db: AsyncSession):

        self.repo = StudyRepository(db)
        self.appt_repo = AppointmentRepository(db)

    async def get_studies(
        self,
        page: int = 1,
        size: int = 20,
        status_filter: Optional[StudyStatus] = None,
        modality: Optional[Modality] = None,
        patient_id: Optional[int] = None,
    ) -> StudyListResponse:

        skip = (page - 1) * size

        items = await self.repo.get_all_with_relations(
            skip=skip,
            limit=size,
            status=status_filter,
            modality=modality,
            patient_id=patient_id,
        )

        total = await self.repo.count_filtered(
            status=status_filter,
            modality=modality,
            patient_id=patient_id,
        )

        pages = math.ceil(total / size) if total > 0 else 1

        return StudyListResponse(
            items=[
                StudyResponse.model_validate(item)
                for item in items
            ],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    async def get_study(
        self,
        study_id: int,
    ) -> Study:

        study = await self.repo.get_by_id_with_relations(
            study_id
        )

        if not study:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Pemeriksaan dengan ID "
                    f"{study_id} tidak ditemukan"
                ),
            )

        return study

    async def create_study(
        self,
        data: StudyCreate,
        created_by: User,
    ) -> Study:

        # Generate accession number
        accession_number = (
            await self.repo.generate_accession_number()
        )

        # Generate Study Instance UID
        study_uid = (
            await self.repo.generate_study_instance_uid()
        )

        # Create study object
        study = Study(
            **data.model_dump(),
            accession_number=accession_number,
            study_instance_uid=study_uid,
            status=StudyStatus.SCHEDULED,
        )

        # Save to database
        created_study = await self.repo.create(
            study
        )

        # Update appointment status
        if data.appointment_id:

            appointment = (
                await self.appt_repo.get_by_id(
                    data.appointment_id
                )
            )

            if (
                appointment
                and appointment.status
                == AppointmentStatus.CHECKED_IN
            ):

                await self.appt_repo.update(
                    appointment,
                    {
                        "status":
                        AppointmentStatus.COMPLETED
                    },
                )

        # Reload with relationships
        study_with_relations = (
            await self.repo.get_by_id_with_relations(
                created_study.id
            )
        )

        if not study_with_relations:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Gagal memuat study "
                    "setelah dibuat"
                ),
            )

        return study_with_relations

    async def update_study(
        self,
        study_id: int,
        data: StudyUpdate,
    ) -> Study:

        # Get current study
        study = await self.get_study(
            study_id
        )

        # Extract update data
        update_data = data.model_dump(
            exclude_none=True
        )

        # Validate status transition
        new_status = update_data.get(
            "status"
        )

        if new_status:

            self._validate_status_transition(
                study.status,
                new_status,
            )

            # Auto set started_at
            if (
                new_status
                == StudyStatus.IN_PROGRESS
                and not update_data.get(
                    "started_at"
                )
            ):

                update_data[
                    "started_at"
                ] = datetime.now(
                    timezone.utc
                )

            # Auto set completed_at
            if (
                new_status in [
                    StudyStatus.COMPLETED,
                    StudyStatus.REPORTED,
                ]
                and not update_data.get(
                    "completed_at"
                )
            ):

                update_data[
                    "completed_at"
                ] = datetime.now(
                    timezone.utc
                )

        # Update study
        updated = await self.repo.update(
            study,
            update_data,
        )

        # Reload with relationships
        study_with_relations = (
            await self.repo.get_by_id_with_relations(
                updated.id
            )
        )

        if not study_with_relations:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Gagal memuat study "
                    "setelah update"
                ),
            )

        return study_with_relations

    def _validate_status_transition(
        self,
        current: StudyStatus,
        new: StudyStatus,
    ) -> None:

        allowed: dict[
            StudyStatus,
            list[StudyStatus]
        ] = {

            StudyStatus.SCHEDULED: [
                StudyStatus.IN_PROGRESS,
                StudyStatus.COMPLETED,
                StudyStatus.CANCELLED,
            ],

            StudyStatus.IN_PROGRESS: [
                StudyStatus.COMPLETED,
                StudyStatus.CANCELLED,
            ],

            StudyStatus.COMPLETED: [
                StudyStatus.REPORTED,
                StudyStatus.CANCELLED,
            ],

            StudyStatus.REPORTED: [],

            StudyStatus.CANCELLED: [],
        }

        if new not in allowed.get(
            current,
            [],
        ):

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Tidak dapat mengubah status "
                    f"dari '{current}' "
                    f"ke '{new}'"
                ),
            )