"""link patient to user

Revision ID: 33f3488b4279
Revises: 0001
Create Date: 2026-05-29 14:42:12.062071
"""

from alembic import op
import sqlalchemy as sa


revision = "33f3488b4279"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "patients",
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column(
        "patients",
        "user_id",
    )