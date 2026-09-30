import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class ResignationCreate(BaseModel):
    reason: str
    proposed_last_working_day: date
    resignation_date: date | None = None

class ResignationReview(BaseModel):
    status: str  # approved, rejected, completed
    notice_period_days: int | None = None
    final_last_working_day: date | None = None
    exit_interview_notes: str | None = None
    clearance_status: str | None = None
    asset_returned: bool | None = None
    final_settlement_status: str | None = None
    comments: str | None = None

class ResignationResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    employee_code: str | None = None
    resignation_date: date
    proposed_last_working_day: date
    reason: str
    status: str
    reviewed_by_id: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    notice_period_days: int = 30
    final_last_working_day: date | None = None
    exit_interview_notes: str | None = None
    clearance_status: str = "pending"
    asset_returned: bool = False
    final_settlement_status: str = "pending"
    comments: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
