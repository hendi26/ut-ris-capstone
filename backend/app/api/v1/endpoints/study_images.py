"""
Study Images API Endpoint
"""

import os
import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.responses import JSONResponse

from app.core.dependencies import get_db
from app.core.permissions import require_permission
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# Base uploads folder
BASE_UPLOAD_DIR = Path("uploads/studies")


@router.get("/{study_id}/images")
async def get_study_images(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("studies:read")),
):
    """
    Get all images for a study
    """

    study_folder = BASE_UPLOAD_DIR / f"study_{study_id}"

    # Folder tidak ada
    if not study_folder.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Folder images untuk study {study_id} tidak ditemukan",
        )

    # Ambil semua image
    image_files = []

    for file in study_folder.iterdir():
        if file.suffix.lower() in [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        ]:
            image_files.append(
                f"/uploads/studies/study_{study_id}/{file.name}"
            )

    # Tidak ada image
    if not image_files:
        raise HTTPException(
            status_code=404,
            detail=f"Tidak ada images untuk study {study_id}",
        )

    return JSONResponse(
        content={
            "study_id": study_id,
            "total_images": len(image_files),
            "images": image_files,
        }
    )


@router.post("/{study_id}/upload")
async def upload_study_image(
    study_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("studies:update")),
):
    """
    Upload image ke study
    """

    # Validasi tipe file
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file tidak diizinkan. Gunakan: {', '.join(allowed_extensions)}",
        )

    # Folder study
    study_folder = BASE_UPLOAD_DIR / f"study_{study_id}"

    # Buat folder jika belum ada
    study_folder.mkdir(parents=True, exist_ok=True)

    # Sanitasi filename untuk mencegah path traversal
    safe_filename = Path(file.filename).name
    file_path = study_folder / safe_filename

    # Simpan file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Image uploaded successfully",
        "study_id": study_id,
        "filename": safe_filename,
        "path": f"/uploads/studies/study_{study_id}/{safe_filename}",
    }


@router.delete("/{study_id}/images/{filename}")
async def delete_study_image(
    study_id: int,
    filename: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_permission("studies:update")),
):
    """
    Delete image dari study
    """

    # Sanitasi filename untuk mencegah path traversal
    safe_filename = Path(filename).name
    if safe_filename != filename:
        raise HTTPException(
            status_code=400,
            detail="Nama file tidak valid",
        )

    # Folder study
    study_folder = BASE_UPLOAD_DIR / f"study_{study_id}"

    # File path
    file_path = study_folder / safe_filename

    # Cek file ada atau tidak
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Image '{safe_filename}' tidak ditemukan",
        )

    # Hapus file
    os.remove(file_path)

    return {
        "message": "Image deleted successfully",
        "study_id": study_id,
        "deleted_file": safe_filename,
    }
