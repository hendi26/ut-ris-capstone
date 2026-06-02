"""
PACS endpoints — integrasi DICOMweb dengan Orthanc (simulasi PACS).

Endpoint:
  GET /pacs/health                            → status koneksi PACS
  GET /pacs/studies                           → QIDO-RS: cari studies
  GET /pacs/studies/by-accession/{no}         → link RIS ↔ PACS via accession number
  GET /pacs/studies/{uid}/series              → QIDO-RS: daftar series
  GET /pacs/studies/{uid}/metadata            → WADO-RS: metadata study

Mode operasi:
  - Jika Orthanc berjalan → pakai data DICOM nyata
  - Jika Orthanc tidak aktif → fallback ke mock data (demo tetap berjalan)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.permissions import require_permission
from app.models.user import User
from app.models.study import Study
from app.services.pacs_service import PACSService

router = APIRouter()


@router.get("/health", summary="Status koneksi PACS (Orthanc)")
async def pacs_health(
    _: User = Depends(require_permission("studies:read")),
):
    """
    Cek status PACS. 
    - status: 'connected' → Orthanc aktif, data nyata
    - status: 'simulated' → fallback mock, demo tetap berjalan
    """
    pacs = PACSService()
    return await pacs.check_pacs_health()


@router.get("/studies", summary="QIDO-RS: Cari studies di PACS")
async def search_pacs_studies(
    patient_id: Optional[str] = Query(default=None, description="Patient ID DICOM"),
    accession_number: Optional[str] = Query(default=None, description="Accession number"),
    study_date: Optional[str] = Query(default=None, description="Format: YYYYMMDD"),
    modality: Optional[str] = Query(default=None, description="Contoh: CT, MR, CR"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("studies:read")),
):
    pacs = PACSService()
    results = await pacs.search_studies(
        patient_id=patient_id,
        accession_number=accession_number,
        study_date=study_date,
        modality=modality,
        limit=limit,
        offset=offset,
    )
    return {
        "total": len(results),
        "offset": offset,
        "studies": results,
    }


@router.get("/studies/by-accession/{accession_number}", summary="Link RIS ↔ PACS via accession number")
async def get_pacs_study_by_accession(
    accession_number: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("studies:read")),
):
    """
    Menghubungkan data study RIS dengan data di PACS berdasarkan accession number.
    1. Cari study di RIS database
    2. Query PACS menggunakan accession number yang sama
    3. Return data gabungan RIS + PACS
    """
    # Cari di RIS
    result = await db.execute(
        select(Study).where(Study.accession_number == accession_number)
    )
    ris_study = result.scalar_one_or_none()

    if not ris_study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study dengan accession number '{accession_number}' tidak ditemukan di RIS",
        )

    # Query PACS
    pacs = PACSService()
    pacs_results = await pacs.search_studies(accession_number=accession_number, limit=5)

    return {
        "accession_number": accession_number,
        "ris_study": {
            "id": ris_study.id,
            "study_instance_uid": ris_study.study_instance_uid,
            "modality": ris_study.modality,
            "body_part": ris_study.body_part,
            "status": ris_study.status,
        },
        "pacs_results": pacs_results,
        "pacs_count": len(pacs_results),
        "pacs_viewer_url": f"http://localhost:8042/app/explorer.html#study?uuid={ris_study.study_instance_uid}",
    }


@router.get("/studies/{study_instance_uid}/series", summary="QIDO-RS: Daftar series dalam study")
async def get_study_series(
    study_instance_uid: str,
    _: User = Depends(require_permission("studies:read")),
):
    pacs = PACSService()
    series = await pacs.get_series(study_instance_uid)
    return {
        "study_instance_uid": study_instance_uid,
        "series_count": len(series),
        "series": series,
    }


@router.get("/studies/{study_instance_uid}/metadata", summary="WADO-RS: Metadata lengkap study")
async def get_study_metadata(
    study_instance_uid: str,
    _: User = Depends(require_permission("studies:read")),
):
    pacs = PACSService()
    metadata = await pacs.get_study_metadata(study_instance_uid)
    return {
        "study_instance_uid": study_instance_uid,
        "metadata": metadata,
    }
