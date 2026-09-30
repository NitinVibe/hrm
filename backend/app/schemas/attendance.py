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
    late_minutes: int = 0
    working_minutes: int = 0
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShiftBrief(BaseModel):
    id: UUID
    name: str
    start_time: str
    end_time: str
    grace_minutes: int


class EmployeeBrief(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str | None


class AttendanceTodayItem(BaseModel):
    id: UUID
    attendance_date: date
    check_in: datetime | None
    check_out: datetime | None
    status: str
    late_minutes: int = 0
    working_minutes: int = 0
    notes: str | None = None


class AttendanceTodayStatusResponse(BaseModel):
    date: str
    has_employee_profile: bool
    employee: EmployeeBrief | None = None
    has_shift: bool
    shift: ShiftBrief | None = None
    is_on_leave: bool
    leave_reason: str | None = None
    state: str  # "NO_PROFILE", "NOT_CHECKED_IN", "CHECKED_IN", "LATE", "CHECKED_OUT", "ON_LEAVE"
    attendance: AttendanceTodayItem | None = None