"""
Script seed data demo untuk production.
Jalankan di Render Shell: python seed_demo.py
"""
import asyncio
from datetime import date, datetime, timezone, timedelta

async def seed():
    from app.db.session import AsyncSessionLocal, engine
    from app.db.base import Base
    from app.models.user import User, UserRole
    from app.models.patient import Patient, Gender
    from app.models.appointment import Appointment, AppointmentStatus, AppointmentPriority
    from app.models.study import Study, StudyStatus, Modality
    from app.models.report import Report, ReportStatus, ReportPriority
    from app.core.security import get_password_hash
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        print("Seeding demo data...")

        # Users
        for uname, ufull, uemail, urole in [
            ('radiolog1',    'Dr. Budi Santoso',   'radiolog@utris.local',    UserRole.RADIOLOG),
            ('dokter1',      'Dr. Siti Rahayu',    'dokter@utris.local',      UserRole.DOKTER),
            ('resepsionis1', 'Dewi Lestari',        'resepsionis@utris.local', UserRole.RESEPSIONIS),
            ('patient1',     'Ahmad Fauzi',         'patient@utris.local',     UserRole.PATIENT),
        ]:
            exists = (await db.execute(select(User).where(User.username == uname))).scalar_one_or_none()
            if not exists:
                db.add(User(username=uname, email=uemail, full_name=ufull,
                           hashed_password=get_password_hash('Password123!'),
                           role=urole, is_active=True))
                print(f"  Created user: {uname}")
        await db.flush()

        # Patients
        now = datetime.now(timezone.utc)
        patients_data = [
            ('MRN000001', 'Ahmad Fauzi',    date(1985,3,15), Gender.LAKI_LAKI,  'O+'),
            ('MRN000002', 'Siti Rahayu',    date(1990,7,22), Gender.PEREMPUAN,  'A+'),
            ('MRN000003', 'Budi Santoso',   date(1975,11,8), Gender.LAKI_LAKI,  'B+'),
            ('MRN000004', 'Dewi Lestari',   date(1988,5,30), Gender.PEREMPUAN,  'AB+'),
            ('MRN000005', 'Hendra Gunawan', date(1995,1,12), Gender.LAKI_LAKI,  'O-'),
        ]
        for mrn, name, dob, gender, blood in patients_data:
            exists = (await db.execute(select(Patient).where(Patient.medical_record_number == mrn))).scalar_one_or_none()
            if not exists:
                db.add(Patient(medical_record_number=mrn, full_name=name,
                              date_of_birth=dob, gender=gender, blood_type=blood))
                print(f"  Created patient: {name}")
        await db.flush()

        # Link patient1 user to Ahmad Fauzi
        pat_user = (await db.execute(select(User).where(User.username == 'patient1'))).scalar_one_or_none()
        ahmad = (await db.execute(select(Patient).where(Patient.medical_record_number == 'MRN000001'))).scalar_one_or_none()
        if pat_user and ahmad and not ahmad.user_id:
            ahmad.user_id = pat_user.id

        # Get user refs
        rad = (await db.execute(select(User).where(User.username == 'radiolog1'))).scalar_one_or_none()
        dok = (await db.execute(select(User).where(User.username == 'dokter1'))).scalar_one_or_none()
        res = (await db.execute(select(User).where(User.username == 'resepsionis1'))).scalar_one_or_none()
        adm = (await db.execute(select(User).where(User.username == 'admin'))).scalar_one_or_none()

        # Appointments
        for appt_num, mrn, mod, body, sched, status, priority in [
            ('APT-20260602-0001', 'MRN000001', 'CT', 'Kepala',         now+timedelta(hours=2),  AppointmentStatus.CONFIRMED,  AppointmentPriority.ROUTINE),
            ('APT-20260602-0002', 'MRN000002', 'MR', 'Tulang Belakang',now+timedelta(hours=4),  AppointmentStatus.PENDING,    AppointmentPriority.URGENT),
            ('APT-20260602-0003', 'MRN000003', 'CR', 'Thorax',         now+timedelta(hours=6),  AppointmentStatus.CHECKED_IN, AppointmentPriority.ROUTINE),
            ('APT-20260601-0001', 'MRN000004', 'DX', 'Abdomen',        now-timedelta(hours=24), AppointmentStatus.COMPLETED,  AppointmentPriority.ROUTINE),
            ('APT-20260601-0002', 'MRN000005', 'US', 'Abdomen',        now-timedelta(hours=48), AppointmentStatus.COMPLETED,  AppointmentPriority.EMERGENCY),
        ]:
            exists = (await db.execute(select(Appointment).where(Appointment.appointment_number == appt_num))).scalar_one_or_none()
            if not exists:
                pat = (await db.execute(select(Patient).where(Patient.medical_record_number == mrn))).scalar_one_or_none()
                if pat:
                    db.add(Appointment(
                        appointment_number=appt_num, patient_id=pat.id, requested_modality=mod,
                        body_part=body, scheduled_datetime=sched, status=status, priority=priority,
                        referring_doctor_id=dok.id if dok else None,
                        created_by_id=res.id if res else adm.id if adm else None,
                        estimated_duration_minutes=30,
                    ))
                    print(f"  Created appointment: {appt_num}")
        await db.flush()

        # Studies
        for acc, uid, mrn, mod, body, status in [
            ('STD-20260601-000001','2.25.1001','MRN000001',Modality.CT,'Kepala',         StudyStatus.COMPLETED),
            ('STD-20260601-000002','2.25.1002','MRN000002',Modality.MR,'Tulang Belakang',StudyStatus.REPORTED),
            ('STD-20260601-000003','2.25.1003','MRN000003',Modality.CR,'Thorax',         StudyStatus.IN_PROGRESS),
            ('STD-20260601-000004','2.25.1004','MRN000004',Modality.DX,'Abdomen',        StudyStatus.REPORTED),
            ('STD-20260601-000005','2.25.1005','MRN000005',Modality.US,'Abdomen',        StudyStatus.COMPLETED),
        ]:
            exists = (await db.execute(select(Study).where(Study.accession_number == acc))).scalar_one_or_none()
            if not exists:
                pat = (await db.execute(select(Patient).where(Patient.medical_record_number == mrn))).scalar_one_or_none()
                if pat:
                    db.add(Study(
                        accession_number=acc, study_instance_uid=uid, patient_id=pat.id,
                        modality=mod, body_part=body, status=status,
                        referring_doctor_id=dok.id if dok else None,
                        performing_radiologist_id=rad.id if rad else None,
                        completed_at=now-timedelta(hours=2) if status in [StudyStatus.COMPLETED, StudyStatus.REPORTED] else None,
                    ))
                    print(f"  Created study: {acc}")
        await db.flush()

        # Reports
        for rpt_num, acc, findings, impression, status in [
            ('RPT-20260601-000001','STD-20260601-000002','Tidak ditemukan kelainan pada tulang belakang lumbal.','Spondylosis Lumbal Ringan',ReportStatus.FINALIZED),
            ('RPT-20260601-000002','STD-20260601-000004','Hepar ukuran normal, echo parenkim homogen.','Tidak tampak kelainan pada organ abdomen',ReportStatus.FINALIZED),
            ('RPT-20260601-000003','STD-20260601-000001','CT kepala: tidak ditemukan perdarahan intrakranial.','CT Kepala Normal',ReportStatus.DRAFT),
        ]:
            study = (await db.execute(select(Study).where(Study.accession_number == acc))).scalar_one_or_none()
            exists = (await db.execute(select(Report).where(Report.report_number == rpt_num))).scalar_one_or_none()
            if study and not exists:
                db.add(Report(
                    report_number=rpt_num, study_id=study.id,
                    findings=findings, impression=impression, status=status,
                    priority=ReportPriority.ROUTINE,
                    radiologist_id=rad.id if rad else adm.id,
                    drafted_at=now-timedelta(hours=5),
                    finalized_at=now-timedelta(hours=1) if status==ReportStatus.FINALIZED else None,
                    verified_by_id=adm.id if status==ReportStatus.FINALIZED else None,
                ))
                print(f"  Created report: {rpt_num}")

        await db.commit()
        print("\n✅ Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
