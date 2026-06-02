from fastapi import HTTPException, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.models.study import Study
from app.models.report import Report, ReportStatus
from app.models.user import User


class PatientPortalService:

    def __init__(
        self,
        db: AsyncSession,
    ):
        self.db = db

    # =====================================================
    # PROFILE
    # =====================================================

    async def get_my_profile(
        self,
        current_user: User,
    ) -> Patient:

        patient = await self.db.scalar(
            select(Patient).where(
                Patient.user_id == current_user.id
            )
        )

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil pasien tidak ditemukan",
            )

        return patient

    # =====================================================
    # STUDIES
    # =====================================================

    async def get_my_studies(
        self,
        current_user: User,
    ):

        patient = await self.get_my_profile(
            current_user
        )

        result = await self.db.execute(
            select(Study)
            .where(
                Study.patient_id == patient.id
            )
            .order_by(
                Study.created_at.desc()
            )
        )

        return result.scalars().all()

    async def get_my_study(
        self,
        study_id: int,
        current_user: User,
    ):

        patient = await self.get_my_profile(
            current_user
        )

        study = await self.db.scalar(
            select(Study).where(
                Study.id == study_id,
                Study.patient_id == patient.id,
            )
        )

        if not study:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pemeriksaan tidak ditemukan",
            )

        return study

    # =====================================================
    # REPORTS
    # =====================================================

    async def get_my_reports(
        self,
        current_user: User,
    ):

        patient = await self.get_my_profile(
            current_user
        )

        result = await self.db.execute(
            select(Report)
            .join(Study)
            .where(
                Study.patient_id == patient.id,
                Report.status == ReportStatus.FINALIZED,
            )
            .order_by(
                Report.created_at.desc()
            )
        )

        return result.scalars().all()

    async def get_my_report(
        self,
        report_id: int,
        current_user: User,
    ):

        patient = await self.get_my_profile(
            current_user
        )

        report = await self.db.scalar(
            select(Report)
            .join(Study)
            .where(
                Report.id == report_id,
                Study.patient_id == patient.id,
                Report.status == ReportStatus.FINALIZED,
            )
        )

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Laporan tidak ditemukan",
            )

        return report