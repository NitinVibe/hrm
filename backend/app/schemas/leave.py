from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LeaveCreate(BaseModel):
    employee_id: UUID
    leave_type: str = Field(min_length=1, max_length=50)
    start_date: date
    end_date: date
    reason: str | None = None


class LeaveResponse(BaseModel):
    id: UUID
    organization_id: UUID
    employee_id: UUID
    leave_type: str
    start_date: date
    end_date: date
    reason: str | None
    status: str
    approved_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)