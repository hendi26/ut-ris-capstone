"""
Report endpoints — laporan radiologi.

Access control:
  GET    /reports               → semua role kecuali resepsionis
  POST   /reports               → admin, radiolog
  GET    /reports/{id}          → semua role kecuali resepsionis
  PATCH  /reports/{id}          → admin, radiolog (penulis saja)
  POST   /reports/{id}/finalize → admin, radiolog
  POST   /reports/{id}/amend    → admin, radiolog
  GET    /reports/{id}/export   → semua role kecuali resepsionis (download PDF)
"""

from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Body, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.permissions import require_permission
from app.models.report import ReportStatus
from app.models.user import User
from app.schemas.report import (
    ReportCreate, ReportUpdate, FinalizeReport,
    ReportResponse, ReportListResponse,
)
from app.services.report_service import ReportService

router = APIRouter()


@router.get("", response_model=ReportListResponse, summary="Daftar laporan radiologi")
async def list_reports(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[ReportStatus] = Query(default=None, alias="status"),
    radiologist_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("reports:read")),
):
    return await ReportService(db).get_reports(
        page=page, size=size,
        status_filter=status_filter, radiologist_id=radiologist_id,
    )


@router.post(
    "", response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Buat laporan radiologi baru",
)
async def create_report(
    data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:create")),
):
    return await ReportService(db).create_report(data, author=current_user)


@router.get("/{report_id}", response_model=ReportResponse, summary="Detail laporan")
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("reports:read")),
):
    return await ReportService(db).get_report(report_id)


@router.patch(
    "/{report_id}", response_model=ReportResponse,
    summary="Update isi laporan (hanya penulis atau admin)",
)
async def update_report(
    report_id: int,
    data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:update")),
):
    return await ReportService(db).update_report(report_id, data, user=current_user)


@router.post(
    "/{report_id}/finalize", response_model=ReportResponse,
    summary="Finalisasi laporan (tanda tangan digital)",
)
async def finalize_report(
    report_id: int,
    body: FinalizeReport = Body(default=FinalizeReport()),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:update")),
):
    return await ReportService(db).finalize_report(
        report_id, verifier=current_user, verified_by_id=body.verified_by_id
    )


@router.post(
    "/{report_id}/amend", response_model=ReportResponse,
    summary="Amandemen laporan yang sudah difinalisasi",
)
async def amend_report(
    report_id: int,
    reason: str = Body(..., embed=True, description="Alasan amandemen"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("reports:update")),
):
    return await ReportService(db).amend_report(report_id, reason=reason, user=current_user)


@router.get(
    "/{report_id}/export",
    summary="Export laporan radiologi ke PDF",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "File PDF laporan radiologi",
        }
    },
)
async def export_report_pdf(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("reports:read")),
):
    """
    Export laporan radiologi ke file PDF.
    
    PDF dihasilkan secara server-side menggunakan ReportLab.
    Berisi:
    - Header institusi (UT-RIS / RSI Bogor)
    - Informasi pemeriksaan (accession number, modalitas, tanggal)
    - Temuan (findings) dan kesan/kesimpulan (impression)
    - Teknik pemeriksaan dan rekomendasi
    - Status, prioritas, dan informasi radiolog
    - Watermark "DRAFT" jika laporan belum difinalisasi
    """
    report = await ReportService(db).get_report(report_id)
    pdf_bytes = _generate_report_pdf(report)

    filename = f"laporan_{report.report_number.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _generate_report_pdf(report: ReportResponse) -> bytes:
    """
    Generate PDF laporan radiologi menggunakan ReportLab.
    Jika ReportLab tidak tersedia, fallback ke format teks sederhana.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
            HRFlowable,
            Image,
)
        from io import BytesIO

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        PRIMARY_COLOR = colors.HexColor("#1e40af")  # primary-800

        style_title = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            textColor=PRIMARY_COLOR,
            fontSize=16,
            spaceAfter=4,
        )
        style_subtitle = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            textColor=colors.gray,
            fontSize=9,
            spaceAfter=2,
        )
        style_section = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            textColor=PRIMARY_COLOR,
            fontSize=11,
            spaceBefore=10,
            spaceAfter=4,
            borderPad=2,
        )
        style_body = ParagraphStyle(
            "BodyText",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            spaceAfter=6,
        )
        style_watermark = ParagraphStyle(
            "Watermark",
            parent=styles["Normal"],
            textColor=colors.Color(1, 0, 0, alpha=0.15),
            fontSize=40,
            alignment=1,
        )

        story = []
        is_draft = report.status in ("draft", "pending_review")

        # ── Header Institusi ──────────────────────────────────────────
        story.append(Paragraph("UT-RIS", style_title))
        story.append(Paragraph("Radiology Information System — RSI Bogor (Simulasi)", style_subtitle))
        story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=8))

        # ── Watermark untuk draft ─────────────────────────────────────
        if is_draft:
            story.append(Paragraph("DRAFT", style_watermark))
            story.append(Spacer(1, 0.2 * cm))

        # ── Nomor & Status Laporan ────────────────────────────────────
        status_value = (
            report.status.value
            if hasattr(report.status, "value")
            else str(report.status)
        )

        status_label = {
            "draft": "Draft",
            "pending_review": "Menunggu Review",
            "finalized": "Final",
            "amended": "Amandemen",
        }.get(status_value, status_value)

        priority_value = (
            report.priority.value
            if hasattr(report.priority, "value")
            else str(report.priority)
        )

        priority_label = {
            "routine": "Rutin",
            "urgent": "Urgent",
            "stat": "STAT",
        }.get(priority_value, priority_value)

        
        header_data = [
            ["No. Laporan:", report.report_number, "Status:", status_label],
            ["Prioritas:", priority_label, "Tanggal:", _fmt_date(report.created_at)],
        ]
        if report.study:
           header_data.append(
               [
                   "Accession No.:",
                   report.study.accession_number,
                   "Modalitas:",
                   report.study.modality.value
                   if hasattr(report.study.modality, "value")
                   else str(report.study.modality),
               ]
           )
           header_data.append(
               [
                   "Bagian Tubuh:",
                   report.study.body_part,
                   "",
                   "",
               ]
           )

        header_table = Table(header_data, colWidths=[3.5 * cm, 6 * cm, 3 * cm, 5.5 * cm])
        header_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), PRIMARY_COLOR),
            ("TEXTCOLOR", (2, 0), (2, -1), PRIMARY_COLOR),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.whitesmoke, colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.4 * cm))

        # ── Data Pasien ───────────────────────────────────────

        if report.study and report.study.patient:

            patient = report.study.patient

            story.append(
                Paragraph(
                    "Data Pasien",
                    style_section,
                )
            )
            
            gender_label = (
                "Laki-laki"
                if getattr(patient.gender, "value", patient.gender) == "L"
                else "Perempuan"
            )


            patient_data = [
                ["Nama Pasien", patient.full_name],
                ["No. Rekam Medis", patient.medical_record_number],
                ["Jenis Kelamin", gender_label],
                ["Tanggal Lahir", str(patient.date_of_birth)],
            ]

            patient_table = Table(
                patient_data,
                colWidths=[
                    4 * cm,
                    10 * cm,
                ],
            )

            patient_table.setStyle(
                TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ])
            )

            story.append(patient_table)
            story.append(Spacer(1, 0.3 * cm))

        # ── Radiolog ──────────────────────────────────────────────────
        if report.radiologist:
            story.append(
                Paragraph("Informasi Radiolog", style_section)
            )
            story.append(
                Paragraph(
                    f"<b>Nama:</b> {report.radiologist.full_name}",
                    style_body,
                )
            )
            story.append(
                Paragraph(
                    "<b>Profesi:</b> Dokter Radiologi",
                    style_body,
                )
            )
            if report.verified_by:
                story.append(Paragraph(f"<b>Diverifikasi oleh:</b> {report.verified_by.full_name}", style_body))
            if report.finalized_at:
                story.append(Paragraph(f"<b>Tanggal finalisasi:</b> {_fmt_date(report.finalized_at)}", style_body))

        # ── Teknik ───────────────────────────────────────────────────
        if report.technique:
            story.append(Paragraph("Teknik Pemeriksaan", style_section))
            story.append(Paragraph(report.technique, style_body))
        # ── Gambar Pemeriksaan ────────────────────────────────────────
        if report.study and report.study.images:
            story.append(Paragraph("Gambar Pemeriksaan", style_section))

            image_count = 0
            for img in report.study.images:
                try:
                    image_path = img.file_path
                    if image_path.startswith("/"):
                        image_path = image_path[1:]

                    image_file = Path(image_path)
                    print("PDF IMAGE:", image_file)

                    if image_file.exists():
                        story.append(Image(str(image_file), width=7 * cm, height=7 * cm))
                        story.append(Spacer(1, 0.2 * cm))
                        image_count += 1

                    if image_count >= 4:
                        break

                except Exception as e:
                    print("PDF image error:", e)

        # ── Findings ─────────────────────────────────────────────────
        story.append(Paragraph("Temuan (Findings)", style_section))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=4))
        story.append(Paragraph(report.findings.replace("\n", "<br/>"), style_body))

        # ── Impression ───────────────────────────────────────────────
        story.append(Paragraph("Kesan / Kesimpulan (Impression)", style_section))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=4))
        imp_style = ParagraphStyle(
            "Impression",
            parent=style_body,
            backColor=colors.Color(0.93, 0.96, 1.0),
            borderPad=6,
            leftIndent=6,
            rightIndent=6,
        )
        story.append(Paragraph(report.impression.replace("\n", "<br/>"), imp_style))

        # ── Rekomendasi ──────────────────────────────────────────────
        if report.recommendation:
            story.append(Paragraph("Rekomendasi", style_section))
            story.append(Paragraph(report.recommendation.replace("\n", "<br/>"), style_body))

        # ── Amandemen ────────────────────────────────────────────────
        if report.amendment_reason:
            story.append(Spacer(1, 0.3 * cm))
            amend_data = [
                ["⚠ LAPORAN INI MERUPAKAN AMANDEMEN"],
                [f"Alasan: {report.amendment_reason}"],
            ]
            amend_table = Table(amend_data, colWidths=[17 * cm])
            amend_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(1.0, 0.95, 0.8)),
                ("BACKGROUND", (0, 1), (-1, 1), colors.Color(1.0, 0.98, 0.9)),
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, 0), colors.Color(0.7, 0.4, 0)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.9, 0.7, 0.3)),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(amend_table)

        # ── Footer ───────────────────────────────────────────────────
        story.append(Spacer(1, 1 * cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        story.append(Paragraph(
            f"Dokumen ini digenerate secara otomatis oleh UT-RIS pada {_fmt_date(datetime.now())}. "
            "Sistem ini merupakan simulasi dalam rangka capstone project Universitas Terbuka. "
            "Data bersifat fiktif untuk keperluan akademik.",
            ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray, spaceBefore=4),
        ))

        doc.build(story)
        return buffer.getvalue()

    except ImportError:
        # Fallback jika ReportLab belum diinstall
        return _generate_text_pdf_fallback(report)


def _generate_text_pdf_fallback(report) -> bytes:
    """Fallback: generate laporan sebagai plain text dalam format bytes."""
    lines = [
        "=" * 60,
        "UT-RIS — LAPORAN RADIOLOGI",
        "Radiology Information System",
        "=" * 60,
        "",
        f"No. Laporan   : {report.report_number}",
        f"Status        : {report.status}",
        f"Prioritas     : {report.priority}",
        f"Tanggal       : {_fmt_date(report.created_at)}",
    ]
    if report.study:
        lines += [
            f"Accession No. : {report.study.accession_number}",
            f"Modalitas     : {report.study.modality}",
            f"Bagian Tubuh  : {report.study.body_part}",
        ]
    if report.radiologist:
        lines.append(f"Radiolog      : {report.radiologist.full_name}")

    lines += ["", "-" * 60, "TEMUAN (FINDINGS)", "-" * 60, report.findings, ""]
    lines += ["-" * 60, "KESAN / KESIMPULAN (IMPRESSION)", "-" * 60, report.impression, ""]
    if report.recommendation:
        lines += ["-" * 60, "REKOMENDASI", "-" * 60, report.recommendation, ""]

    lines += [
        "",
        "=" * 60,
        "Catatan: Dokumen ini merupakan simulasi untuk keperluan",
        "capstone project Universitas Terbuka.",
        "=" * 60,
    ]
    return "\n".join(lines).encode("utf-8")


def _fmt_date(dt) -> str:
    if dt is None:
        return "-"
    if isinstance(dt, datetime):
        return dt.strftime("%d %B %Y, %H:%M WIB")
    return str(dt)