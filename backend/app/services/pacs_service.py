"""
PACS Service — integrasi DICOMweb dengan Orthanc (simulasi PACS).

Menggunakan protokol DICOMweb standar:
  - QIDO-RS : Query based on ID for DICOM Objects by RESTful Services
  - WADO-RS : Web Access to DICOM Objects by RESTful Services

Strategi koneksi:
  1. Coba sambung ke Orthanc (PACS nyata) → jika berhasil, pakai data real.
  2. Jika Orthanc tidak bisa dijangkau (ConnectError / timeout)
     → fallback ke mock data DICOM yang realistis agar demo tetap berjalan.

Catatan arsitektur:
  Orthanc digunakan sebagai PACS simulasi selama fase capstone.
  Koneksi ke PACS produksi RSI Bogor direncanakan sebagai tahap lanjutan.
"""

from datetime import datetime, timezone
from typing import Any, Optional
import httpx

from app.core.config import settings

# ─── Mock DICOM studies (format standar QIDO-RS / DICOMweb JSON) ──────────────
# Tag format: DICOM (ggggeeee) → value = {"vr": "...", "Value": [...]}
# Referensi: https://dicom.nema.org/medical/dicom/current/output/chtml/part18/sect_10.6.html

_MOCK_STUDIES: list[dict[str, Any]] = [
    {
        "0020000D": {"vr": "UI", "Value": ["2.25.1001"]},          # StudyInstanceUID
        "00200010": {"vr": "SH", "Value": ["MRN000001"]},          # PatientID
        "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Ahmad Fauzi"}]},
        "00100020": {"vr": "LO", "Value": ["MRN000001"]},
        "00080060": {"vr": "CS", "Value": ["CT"]},                 # Modality
        "00080020": {"vr": "DA", "Value": ["20260601"]},           # StudyDate
        "00080030": {"vr": "TM", "Value": ["083000"]},             # StudyTime
        "00080050": {"vr": "SH", "Value": ["STD-20260601-000001"]},# AccessionNumber
        "00081030": {"vr": "LO", "Value": ["CT Kepala tanpa kontras"]},
        "00201206": {"vr": "IS", "Value": [1]},                    # NumSeries
        "00201208": {"vr": "IS", "Value": [24]},                   # NumInstances
        "pacs_source": "mock",
    },
    {
        "0020000D": {"vr": "UI", "Value": ["2.25.1002"]},
        "00200010": {"vr": "SH", "Value": ["MRN000002"]},
        "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Siti Rahayu"}]},
        "00100020": {"vr": "LO", "Value": ["MRN000002"]},
        "00080060": {"vr": "CS", "Value": ["MR"]},
        "00080020": {"vr": "DA", "Value": ["20260601"]},
        "00080030": {"vr": "TM", "Value": ["100000"]},
        "00080050": {"vr": "SH", "Value": ["STD-20260601-000002"]},
        "00081030": {"vr": "LO", "Value": ["MRI Lumbal tanpa kontras"]},
        "00201206": {"vr": "IS", "Value": [3]},
        "00201208": {"vr": "IS", "Value": [180]},
        "pacs_source": "mock",
    },
    {
        "0020000D": {"vr": "UI", "Value": ["2.25.1003"]},
        "00200010": {"vr": "SH", "Value": ["MRN000003"]},
        "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Budi Santoso"}]},
        "00100020": {"vr": "LO", "Value": ["MRN000003"]},
        "00080060": {"vr": "CS", "Value": ["CR"]},
        "00080020": {"vr": "DA", "Value": ["20260601"]},
        "00080030": {"vr": "TM", "Value": ["110000"]},
        "00080050": {"vr": "SH", "Value": ["STD-20260601-000003"]},
        "00081030": {"vr": "LO", "Value": ["Thorax PA"]},
        "00201206": {"vr": "IS", "Value": [1]},
        "00201208": {"vr": "IS", "Value": [2]},
        "pacs_source": "mock",
    },
    {
        "0020000D": {"vr": "UI", "Value": ["2.25.1004"]},
        "00200010": {"vr": "SH", "Value": ["MRN000004"]},
        "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Dewi Lestari"}]},
        "00100020": {"vr": "LO", "Value": ["MRN000004"]},
        "00080060": {"vr": "CS", "Value": ["DX"]},
        "00080020": {"vr": "DA", "Value": ["20260601"]},
        "00080030": {"vr": "TM", "Value": ["090000"]},
        "00080050": {"vr": "SH", "Value": ["STD-20260601-000004"]},
        "00081030": {"vr": "LO", "Value": ["Abdomen AP"]},
        "00201206": {"vr": "IS", "Value": [1]},
        "00201208": {"vr": "IS", "Value": [1]},
        "pacs_source": "mock",
    },
    {
        "0020000D": {"vr": "UI", "Value": ["2.25.1005"]},
        "00200010": {"vr": "SH", "Value": ["MRN000005"]},
        "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Hendra Gunawan"}]},
        "00100020": {"vr": "LO", "Value": ["MRN000005"]},
        "00080060": {"vr": "CS", "Value": ["US"]},
        "00080020": {"vr": "DA", "Value": ["20260531"]},
        "00080030": {"vr": "TM", "Value": ["140000"]},
        "00080050": {"vr": "SH", "Value": ["STD-20260601-000005"]},
        "00081030": {"vr": "LO", "Value": ["USG Abdomen"]},
        "00201206": {"vr": "IS", "Value": [1]},
        "00201208": {"vr": "IS", "Value": [8]},
        "pacs_source": "mock",
    },
]

_MOCK_SERIES: dict[str, list[dict[str, Any]]] = {
    "2.25.1001": [
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1001.1"]},   # SeriesInstanceUID
            "00200011": {"vr": "IS", "Value": [1]},               # SeriesNumber
            "00080060": {"vr": "CS", "Value": ["CT"]},
            "0008103E": {"vr": "LO", "Value": ["Brain - Axial 5mm"]},
            "00201209": {"vr": "IS", "Value": [24]},
        }
    ],
    "2.25.1002": [
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1002.1"]},
            "00200011": {"vr": "IS", "Value": [1]},
            "00080060": {"vr": "CS", "Value": ["MR"]},
            "0008103E": {"vr": "LO", "Value": ["T1 Sagittal"]},
            "00201209": {"vr": "IS", "Value": [60]},
        },
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1002.2"]},
            "00200011": {"vr": "IS", "Value": [2]},
            "00080060": {"vr": "CS", "Value": ["MR"]},
            "0008103E": {"vr": "LO", "Value": ["T2 Sagittal"]},
            "00201209": {"vr": "IS", "Value": [60]},
        },
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1002.3"]},
            "00200011": {"vr": "IS", "Value": [3]},
            "00080060": {"vr": "CS", "Value": ["MR"]},
            "0008103E": {"vr": "LO", "Value": ["STIR Coronal"]},
            "00201209": {"vr": "IS", "Value": [60]},
        },
    ],
    "2.25.1003": [
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1003.1"]},
            "00200011": {"vr": "IS", "Value": [1]},
            "00080060": {"vr": "CS", "Value": ["CR"]},
            "0008103E": {"vr": "LO", "Value": ["Thorax PA"]},
            "00201209": {"vr": "IS", "Value": [1]},
        },
        {
            "0020000E": {"vr": "UI", "Value": ["2.25.1003.2"]},
            "00200011": {"vr": "IS", "Value": [2]},
            "00080060": {"vr": "CS", "Value": ["CR"]},
            "0008103E": {"vr": "LO", "Value": ["Thorax Lateral"]},
            "00201209": {"vr": "IS", "Value": [1]},
        },
    ],
}


def _get_mock_series(study_uid: str) -> list[dict[str, Any]]:
    """Return mock series untuk study UID yang diketahui, atau generic series."""
    if study_uid in _MOCK_SERIES:
        return _MOCK_SERIES[study_uid]
    # Generic fallback untuk UID tidak dikenal
    return [
        {
            "0020000E": {"vr": "UI", "Value": [f"{study_uid}.1"]},
            "00200011": {"vr": "IS", "Value": [1]},
            "00080060": {"vr": "CS", "Value": ["OT"]},
            "0008103E": {"vr": "LO", "Value": ["Series 1"]},
            "00201209": {"vr": "IS", "Value": [1]},
        }
    ]


def _get_mock_metadata(study_uid: str) -> dict[str, Any]:
    """Return mock metadata DICOM untuk satu study."""
    # Cari di mock studies
    for s in _MOCK_STUDIES:
        uid_list = s.get("0020000D", {}).get("Value", [])
        if uid_list and uid_list[0] == study_uid:
            return {
                **s,
                "00080016": {"vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"]},  # SOPClassUID CT
                "00181030": {"vr": "LO", "Value": ["STANDARD"]},
                "00280030": {"vr": "DS", "Value": ["0.488281", "0.488281"]},
                "00280010": {"vr": "US", "Value": [512]},
                "00280011": {"vr": "US", "Value": [512]},
                "pacs_source": "mock",
            }
    # Generic metadata
    now = datetime.now(timezone.utc)
    return {
        "0020000D": {"vr": "UI", "Value": [study_uid]},
        "00080020": {"vr": "DA", "Value": [now.strftime("%Y%m%d")]},
        "00080030": {"vr": "TM", "Value": [now.strftime("%H%M%S")]},
        "00080060": {"vr": "CS", "Value": ["OT"]},
        "pacs_source": "mock",
    }


class PACSService:
    """
    Client untuk berkomunikasi dengan Orthanc PACS via DICOMweb REST API.
    Jika Orthanc tidak dapat dijangkau, otomatis fallback ke mock DICOM data.
    """

    def __init__(self):
        self.base_url = settings.ORTHANC_URL.rstrip("/")
        self.dicomweb_root = f"{self.base_url}/dicom-web"
        self.auth = (settings.ORTHANC_USER, settings.ORTHANC_PASSWORD)

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            auth=self.auth,
            timeout=5.0,   # timeout pendek agar fallback cepat
            headers={"Accept": "application/json"},
        )

    async def _orthanc_available(self) -> bool:
        """Cek apakah Orthanc bisa dijangkau (quick ping)."""
        try:
            async with self._client() as client:
                r = await client.get(f"{self.base_url}/system")
                return r.status_code == 200
        except Exception:
            return False

    # ─── QIDO-RS: Query Studies ────────────────────────────────────────

    async def search_studies(
        self,
        patient_id: Optional[str] = None,
        accession_number: Optional[str] = None,
        study_date: Optional[str] = None,
        modality: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:

        # Coba Orthanc nyata dulu
        try:
            params: dict[str, Any] = {"limit": limit, "offset": offset}
            if patient_id:
                params["PatientID"] = patient_id
            if accession_number:
                params["AccessionNumber"] = accession_number
            if study_date:
                params["StudyDate"] = study_date
            if modality:
                params["ModalitiesInStudy"] = modality

            async with self._client() as client:
                response = await client.get(f"{self.dicomweb_root}/studies", params=params)
                if response.status_code == 204:
                    return []
                response.raise_for_status()
                return response.json()

        except Exception:
            # Fallback ke mock data
            results = _MOCK_STUDIES[offset:offset + limit]

            # Filter mock sesuai parameter
            if patient_id:
                results = [s for s in results if patient_id in str(s.get("00100020", {}).get("Value", []))]
            if accession_number:
                results = [s for s in results if accession_number in str(s.get("00080050", {}).get("Value", []))]
            if modality:
                results = [s for s in results if modality in str(s.get("00080060", {}).get("Value", []))]

            return results

    # ─── QIDO-RS: Query Series ─────────────────────────────────────────

    async def get_series(self, study_instance_uid: str) -> list[dict[str, Any]]:

        try:
            async with self._client() as client:
                response = await client.get(
                    f"{self.dicomweb_root}/studies/{study_instance_uid}/series",
                )
                if response.status_code == 204:
                    return []
                response.raise_for_status()
                return response.json()

        except Exception:
            return _get_mock_series(study_instance_uid)

    # ─── WADO-RS: Retrieve Study Metadata ─────────────────────────────

    async def get_study_metadata(self, study_instance_uid: str) -> dict[str, Any]:

        try:
            async with self._client() as client:
                response = await client.get(
                    f"{self.dicomweb_root}/studies/{study_instance_uid}/metadata",
                )
                response.raise_for_status()
                data = response.json()
                return data[0] if isinstance(data, list) and data else {}

        except Exception:
            return _get_mock_metadata(study_instance_uid)

    # ─── Health Check ──────────────────────────────────────────────────

    async def check_pacs_health(self) -> dict[str, Any]:

        try:
            async with self._client() as client:
                response = await client.get(f"{self.base_url}/system")
                response.raise_for_status()
                data = response.json()
                return {
                    "status": "connected",
                    "mode": "live",
                    "orthanc_version": data.get("Version", "unknown"),
                    "dicom_aet": data.get("DicomAet", "unknown"),
                    "storage_size_mb": round(data.get("TotalDiskSizeMB", 0), 2),
                    "count_studies": data.get("CountStudies", 0),
                }

        except Exception:
            # Fallback: PACS simulasi dengan data mock
            return {
                "status": "simulated",
                "mode": "mock",
                "orthanc_version": "1.12.x (simulasi)",
                "dicom_aet": "UTRIS_DEV",
                "storage_size_mb": 0,
                "count_studies": len(_MOCK_STUDIES),
                "note": (
                    "Orthanc tidak aktif — sistem berjalan dalam mode PACS simulasi. "
                    "Data DICOM adalah contoh untuk keperluan demo capstone. "
                    "Jalankan Orthanc untuk koneksi PACS nyata."
                ),
            }
