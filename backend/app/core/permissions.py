"""
Role-Based Access Control (RBAC) — permission matrix and dependency factories.

Roles
─────
  admin        → full system access
  radiolog     → read/write studies & reports; read patients & appointments
  dokter       → read patients; create/read appointments; read reports for own patients
  resepsionis  → create/read/update patients & appointments; read-only studies
  patient      → akses portal pasien sendiri

Permission Matrix
─────────────────
Resource          admin  radiolog  dokter  resepsionis  patient
───────────────────────────────────────────────────────────────
users             CRUD   -         -       -            -
patients          CRUD   R         R       CRU          -
appointments      CRUD   R         CR      CRUD         -
studies           CRUD   CRUD      R       R            -
reports           CRUD   CRUD      R       -            -
dashboard stats   R      R         R       R            -
patient portal    -      -         -       -            R
"""

from typing import Callable

from fastapi import Depends, HTTPException, status

from app.models.user import User, UserRole
from app.core.dependencies import get_current_active_user


# ─────────────────────────────────────────────────────────────
# Permission Sets Per Role
# ─────────────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[UserRole, frozenset[str]] = {
    UserRole.ADMIN: frozenset({
        # Users
        "users:read",
        "users:create",
        "users:update",
        "users:delete",

        # Patients
        "patients:read",
        "patients:create",
        "patients:update",
        "patients:delete",

        # Appointments
        "appointments:read",
        "appointments:create",
        "appointments:update",
        "appointments:delete",

        # Studies
        "studies:read",
        "studies:create",
        "studies:update",
        "studies:delete",

        # Reports
        "reports:read",
        "reports:create",
        "reports:update",
        "reports:delete",

        # Dashboard
        "dashboard:read",
    }),

    UserRole.RADIOLOG: frozenset({
        # Patients
        "patients:read",

        # Appointments
        "appointments:read",

        # Studies
        "studies:read",
        "studies:create",
        "studies:update",

        # Reports
        "reports:read",
        "reports:create",
        "reports:update",

        # Dashboard
        "dashboard:read",
    }),

    UserRole.DOKTER: frozenset({
        # Patients
        "patients:read",

        # Appointments
        "appointments:read",
        "appointments:create",

        # Studies
        "studies:read",

        # Reports
        "reports:read",

        # Dashboard
        "dashboard:read",
    }),

    UserRole.RESEPSIONIS: frozenset({
        # Patients
        "patients:read",
        "patients:create",
        "patients:update",

        # Appointments
        "appointments:read",
        "appointments:create",
        "appointments:update",
        "appointments:delete",

        # Studies
        "studies:read",

        # Dashboard
        "dashboard:read",
    }),

    UserRole.PATIENT: frozenset({
        # Patient Portal
        "patient_portal:read",
    }),
}


# ─────────────────────────────────────────────────────────────
# Permission Helpers
# ─────────────────────────────────────────────────────────────

def has_permission(
    user: User,
    permission: str,
) -> bool:
    """
    Check whether a user has a specific permission.
    """
    return permission in ROLE_PERMISSIONS.get(
        user.role,
        frozenset(),
    )


def require_permission(
    permission: str,
) -> Callable:
    """
    Dependency factory — raises 403 if the current user lacks permission.

    Example:

        current_user: User = Depends(
            require_permission("patients:read")
        )
    """

    async def _check(
        current_user: User = Depends(
            get_current_active_user
        )
    ) -> User:

        if not has_permission(
            current_user,
            permission,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Diperlukan izin: '{permission}'",
            )

        return current_user

    return _check


def require_roles(
    *roles: UserRole,
) -> Callable:
    """
    Dependency factory — raises 403 if the user's role
    is not in the allowed list.
    """

    role_set = frozenset(roles)

    async def _check(
        current_user: User = Depends(
            get_current_active_user
        )
    ) -> User:

        if current_user.role not in role_set:
            allowed = ", ".join(
                role.value
                for role in roles
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Role yang diizinkan: {allowed}",
            )

        return current_user

    return _check


# ─────────────────────────────────────────────────────────────
# Convenience Dependencies
# ─────────────────────────────────────────────────────────────

require_admin = require_roles(
    UserRole.ADMIN
)

require_admin_or_radiolog = require_roles(
    UserRole.ADMIN,
    UserRole.RADIOLOG,
)

require_admin_or_dokter = require_roles(
    UserRole.ADMIN,
    UserRole.DOKTER,
)

require_admin_or_resepsionis = require_roles(
    UserRole.ADMIN,
    UserRole.RESEPSIONIS,
)

require_clinical_staff = require_roles(
    UserRole.ADMIN,
    UserRole.RADIOLOG,
    UserRole.DOKTER,
)

require_any_role = require_roles(
    UserRole.ADMIN,
    UserRole.RADIOLOG,
    UserRole.DOKTER,
    UserRole.RESEPSIONIS,
    UserRole.PATIENT,
)