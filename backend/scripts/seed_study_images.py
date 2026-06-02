from pathlib import Path
import sqlite3

# Lokasi database SQLite
DB_PATH = Path("utris.db")

# Lokasi folder images
UPLOADS_DIR = Path("uploads/studies")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

inserted = 0

for study_folder in UPLOADS_DIR.iterdir():

    if not study_folder.is_dir():
        continue

    # study_1 -> 1
    try:
        study_id = int(study_folder.name.replace("study_", ""))
    except ValueError:
        continue

    for image_file in study_folder.iterdir():

        if image_file.suffix.lower() not in [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        ]:
            continue

        file_path = (
            f"/uploads/studies/"
            f"{study_folder.name}/"
            f"{image_file.name}"
        )

        # cek apakah sudah ada
        cursor.execute(
            """
            SELECT id
            FROM study_images
            WHERE study_id = ?
            AND filename = ?
            """,
            (
                study_id,
                image_file.name,
            ),
        )

        exists = cursor.fetchone()

        if exists:
            continue

        cursor.execute(
            """
            INSERT INTO study_images
            (
                study_id,
                filename,
                file_path
            )
            VALUES (?, ?, ?)
            """,
            (
                study_id,
                image_file.name,
                file_path,
            ),
        )

        inserted += 1

conn.commit()
conn.close()

print(
    f"✅ Seed selesai. "
    f"{inserted} images ditambahkan."
)