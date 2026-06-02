"""
Report repository — data access layer for Report model.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import (
    select,
    func,
)

from sqlalchemy.orm import (
    selectinload,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.models.report import (
    Report,
    ReportStatus,
)

from app.models.study import (
    Study,
)

from app.repositories.base_repository import (
    BaseRepository,
)


class ReportRepository(
    BaseRepository[Report]
):

    def __init__(
        self,
        db: AsyncSession,
    ):
        super().__init__(
            Report,
            db,
        )

    async def get_by_id_with_relations(
        self,
        id: int,
    ) -> Optional[Report]:

        result = await self.db.execute(
            select(Report)
            .options(

                # Study
                selectinload(
                    Report.study
                ),

                # Patient
                selectinload(
                    Report.study
                ).selectinload(
                    Study.patient
                ),

                # Study Images
                selectinload(
                    Report.study
                ).selectinload(
                    Study.images
                ),

                # Author
                selectinload(
                    Report.radiologist
                ),

                # Verifier
                selectinload(
                    Report.verified_by
                ),
            )
            .where(
                Report.id == id
            )
        )

        return result.scalar_one_or_none()

    async def get_by_study_id(
        self,
        study_id: int,
    ) -> Optional[Report]:

        result = await self.db.execute(
            select(Report)
            .where(
                Report.study_id == study_id
            )
        )

        return result.scalar_one_or_none()

    async def get_all_with_relations(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[
            ReportStatus
        ] = None,
        radiologist_id: Optional[
            int
        ] = None,
    ) -> list[Report]:

        query = (
            select(Report)
            .options(

                # Study
                selectinload(
                    Report.study
                ),

                # Patient
                selectinload(
                    Report.study
                ).selectinload(
                    Study.patient
                ),

                # Images
                selectinload(
                    Report.study
                ).selectinload(
                    Study.images
                ),

                # Author
                selectinload(
                    Report.radiologist
                ),

                # Verifier
                selectinload(
                    Report.verified_by
                ),
            )
            .order_by(
                Report.created_at.desc()
            )
        )

        if status:

            query = query.where(
                Report.status == status
            )

        if radiologist_id:

            query = query.where(
                Report.radiologist_id
                == radiologist_id
            )

        query = (
            query
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(
            query
        )

        return list(
            result.scalars().all()
        )

    async def count_filtered(
        self,
        status: Optional[
            ReportStatus
        ] = None,
        radiologist_id: Optional[
            int
        ] = None,
    ) -> int:

        query = (
            select(func.count())
            .select_from(Report)
        )

        if status:

            query = query.where(
                Report.status == status
            )

        if radiologist_id:

            query = query.where(
                Report.radiologist_id
                == radiologist_id
            )

        result = await self.db.execute(
            query
        )

        return result.scalar_one()

    async def count_pending(
        self,
    ) -> int:
        """
        Jumlah laporan yang belum
        difinalisasi.
        """

        result = await self.db.execute(
            select(func.count())
            .select_from(Report)
            .where(
                Report.status.in_(
                    [
                        ReportStatus.DRAFT,
                        ReportStatus.PENDING_REVIEW,
                    ]
                )
            )
        )

        return result.scalar_one()

    async def generate_report_number(
        self,
    ) -> str:

        today = datetime.now(
            timezone.utc
        ).strftime(
            "%Y%m%d"
        )

        start = datetime(
            datetime.now(timezone.utc).year,
            datetime.now(timezone.utc).month,
            datetime.now(timezone.utc).day,
            tzinfo=timezone.utc,
        )
        end = start + timedelta(days=1)

        result = await self.db.execute(
            select(func.count())
            .select_from(Report)
            .where(Report.created_at >= start)
            .where(Report.created_at < end)
        )

        count = result.scalar_one()

        return (
            f"RPT-{today}-"
            f"{str(count + 1).zfill(6)}"
        )