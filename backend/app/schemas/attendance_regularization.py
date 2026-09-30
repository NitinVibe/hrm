import uuid
from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict

class AttendanceRegularizationCreate(BaseModel):
    attendance_date: date
    requested_check_in: time | None = None
    requested_check_out: time | None = None
    reason: str

class AttendanceRegularizationReview(BaseModel):
    rejection_reason: str | None = None

class AttendanceRegularizationResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID
    attendance_date: date
    requested_check_in: time | None
    requested_check_out: time | None
    reason: str
    status: str
    reviewed_by_id: uuid.UUID | None
    reviewed_at: datetime | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
