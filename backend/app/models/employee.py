import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base



class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    department_id: Mapped[uuid.UUID | None] = mapped_column(
    ForeignKey("departments.id"),
    nullable=True,
    index=True,
    )

    designation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("designations.id"),
        nullable=True,
        index=True,
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        unique=True,
    )

    employee_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    joining_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    employment_status: Mapped[str] = mapped_column(
        String(30),
        default="active",
        nullable=False,
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
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("shifts.id"),
        nullable=True,
        index=True,
    )
    

    organization = relationship(
        "Organization",
        back_populates="employees",
    )

    user = relationship(
        "User",
        back_populates="employee",
    )

    department = relationship("Department")
    designation = relationship("Designation")
    shift = relationship("Shift")