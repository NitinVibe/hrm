import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    attendance_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    check_in: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    check_out: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="present",
        nullable=False,
    )

    late_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    working_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    employee = relationship("Employee")
    organization = relationship("Organization")