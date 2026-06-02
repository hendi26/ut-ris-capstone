from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.study import (
    Modality,
    StudyStatus,
)


# =====================================================
# PROFILE
# =====================================================

class PatientMeResponse(BaseModel):
    id: int
    medical_record_number: str
    full_name: str

    nik: Optional[str] = None

    date_of_birth: date

    gender: str

    phone_number: Optional[str] = None

    address: Optional[str] = None

    blood_type: Optional[str] = None

    allergies: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


# =====================================================
# STUDIES
# =====================================================

class PatientStudyResponse(BaseModel):

    id: int

    accession_number: str

    modality: Modality

    body_part: str

    status: StudyStatus

    clinical_indication: Optional[str] = None

    procedure_description: Optional[str] = None

    scheduled_at: Optional[datetime] = None

    started_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None

    created_at: datetime

    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class PatientStudyListResponse(BaseModel):

    items: List[PatientStudyResponse]

# =====================================================
# REPORTS
# =====================================================

class PatientReportResponse(BaseModel):

    id: int

    report_number: str

    study_id: int

    status: str

    priority: str

    findings: str

    impression: str

    recommendation: Optional[str] = None

    finalized_at: Optional[datetime] = None

    created_at: datetime

    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class PatientReportListResponse(BaseModel):

    items: List[PatientReportResponse]