"""
Main API v1 router — aggregates all feature routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    patients,
    appointments,
    studies,
    reports,
    dashboard,
    pacs,
    study_images,
    patient_portal,
)

api_router = APIRouter()

# Authentication
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# Users
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)

# Patients
api_router.include_router(
    patients.router,
    prefix="/patients",
    tags=["Patients"],
)

# Appointments
api_router.include_router(
    appointments.router,
    prefix="/appointments",
    tags=["Appointments"],
)

# Studies
api_router.include_router(
    studies.router,
    prefix="/studies",
    tags=["Studies"],
)

# Study Images
api_router.include_router(
    study_images.router,
    prefix="/studies",
    tags=["Study Images"],
)

# Reports
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
)

# Dashboard
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"],
)

# PACS Integration
api_router.include_router(
    pacs.router,
    prefix="/pacs",
    tags=["PACS Integration"],
)

# Patient Portal
api_router.include_router(
    patient_portal.router,
    prefix="/patient",
    tags=["Patient Portal"],
)