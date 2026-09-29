"""add department and designation to employees

Revision ID: ce3ccaf55d4d
Revises: 76b5b483a38d
Create Date: 2026-09-28 11:06:24.925063

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ce3ccaf55d4d"
down_revision: Union[str, Sequence[str], None] = "76b5b483a38d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "employees",
        sa.Column("department_id", sa.Uuid(), nullable=True),
    )

    op.add_column(
        "employees",
        sa.Column("designation_id", sa.Uuid(), nullable=True),
    )

    op.create_index(
        op.f("ix_employees_department_id"),
        "employees",
        ["department_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_employees_designation_id"),
        "employees",
        ["designation_id"],
        unique=False,
    )

    op.create_foreign_key(
        "employees_designation_id_fkey",
        "employees",
        "designations",
        ["designation_id"],
        ["id"],
    )

    op.create_foreign_key(
        "employees_department_id_fkey",
        "employees",
        "departments",
        ["department_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "employees_designation_id_fkey",
        "employees",
        type_="foreignkey",
    )

    op.drop_constraint(
        "employees_department_id_fkey",
        "employees",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_employees_designation_id"),
        table_name="employees",
    )

    op.drop_index(
        op.f("ix_employees_department_id"),
        table_name="employees",
    )

    op.drop_column(
        "employees",
        "designation_id",
    )

    op.drop_column(
        "employees",
        "department_id",
    )