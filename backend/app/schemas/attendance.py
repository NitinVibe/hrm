from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AttendanceResponse(BaseModel):
    id: UUID
    organization_id: UUID
    employee_id: UUID
    attendance_date: date
    check_in: datetime | None
    check_out: datetime | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)