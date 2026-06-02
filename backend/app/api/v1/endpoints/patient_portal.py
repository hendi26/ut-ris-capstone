from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.responses import Response

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_db,
    get_current_user,
)

from app.models.user import (
    User,
    UserRole,
)

from app.schemas.patient_portal import (
    PatientMeResponse,
    PatientStudyListResponse,
    PatientStudyResponse,
    PatientReportListResponse,
    PatientReportResponse,
)

from app.schemas.report import ReportResponse

from app.services.patient_portal_service import (
    PatientPortalService,
)

router = APIRouter()


# =====================================================
# PROFILE
# =====================================================

@router.get(
    "/me",
    response_model=PatientMeResponse,
    summary="Profil pasien yang sedang login",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    return await PatientPortalService(
        db
    ).get_my_profile(
        current_user
    )


# =====================================================
# MY STUDIES
# =====================================================

@router.get(
    "/my-studies",
    response_model=PatientStudyListResponse,
    summary="Daftar pemeriksaan milik pasien",
)
async def get_my_studies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    studies = await PatientPortalService(
        db
    ).get_my_studies(
        current_user
    )

    return {
        "items": studies
    }


@router.get(
    "/my-studies/{study_id}",
    response_model=PatientStudyResponse,
    summary="Detail pemeriksaan milik pasien",
)
async def get_my_study(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    return await PatientPortalService(
        db
    ).get_my_study(
        study_id,
        current_user,
    )


# =====================================================
# MY REPORTS
# =====================================================

@router.get(
    "/my-reports",
    response_model=PatientReportListResponse,
    summary="Daftar laporan radiologi pasien",
)
async def get_my_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    reports = await PatientPortalService(
        db
    ).get_my_reports(
        current_user
    )

    return {
        "items": reports
    }


@router.get(
    "/my-reports/{report_id}",
    response_model=PatientReportResponse,
    summary="Detail laporan radiologi pasien",
)
async def get_my_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    return await PatientPortalService(
        db
    ).get_my_report(
        report_id,
        current_user,
    )


# =====================================================
# EXPORT PDF — patient mengunduh laporan miliknya sendiri
# =====================================================

@router.get(
    "/my-reports/{report_id}/export",
    response_class=Response,
    summary="Download PDF laporan pasien",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "File PDF laporan radiologi",
        }
    },
)
async def export_my_report_pdf(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Patient mengunduh laporan miliknya sendiri (hanya FINALIZED).
    Endpoint ini melewati permission reports:read dan menggantinya
    dengan ownership check — pasien hanya bisa unduh laporan miliknya.
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya pasien yang dapat mengakses endpoint ini",
        )

    # Pastikan laporan ini milik pasien yang login (ownership check)
    report = await PatientPortalService(db).get_my_report(report_id, current_user)

    # Lazy import untuk hindari circular imports
    from app.repositories.report_repository import ReportRepository
    from app.schemas.report import ReportResponse as ReportSchemaResponse
    from app.api.v1.endpoints.reports import _generate_report_pdf

    # Load dengan relasi lengkap (patient, study, radiologist) untuk PDF
    full_report = await ReportRepository(db).get_by_id_with_relations(report.id)
    if not full_report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laporan tidak ditemukan")

    report_schema = ReportSchemaResponse.model_validate(full_report)
    pdf_bytes = _generate_report_pdf(report_schema)

    filename = f"laporan_{report.report_number.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
