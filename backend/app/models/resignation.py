import uuid
from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Resignation(Base):
    __tablename__ = "resignations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    
    resignation_date: Mapped[date] = mapped_column(Date, nullable=False)
    proposed_last_working_day: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)  # pending, approved, rejected, withdrawn, completed
    
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    notice_period_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    final_last_working_day: Mapped[date | None] = mapped_column(Date, nullable=True)
    exit_interview_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clearance_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, in_progress, completed
    asset_returned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    final_settlement_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, processed, paid
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    employee = relationship("Employee")
    reviewed_by = relationship("User")
