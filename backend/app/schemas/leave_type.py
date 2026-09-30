import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LeaveTypeBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    days_allowed_per_year: float = 12.0
    carry_forward_days: float = 0.0
    is_paid: bool = True
    is_active: bool = True

class LeaveTypeCreate(LeaveTypeBase):
    pass

class LeaveTypeUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    days_allowed_per_year: float | None = None
    carry_forward_days: float | None = None
    is_paid: bool | None = None
    is_active: bool | None = None

class LeaveTypeResponse(LeaveTypeBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int
    total_allocated: float
    used_days: float
    pending_days: float
    available_days: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LeaveBalanceAllocate(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int
    total_allocated: float
