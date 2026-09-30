import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class PerformanceCycleBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    status: str = "active"

class PerformanceCycleCreate(PerformanceCycleBase):
    pass

class PerformanceCycleUpdate(BaseModel):
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None

class PerformanceCycleResponse(PerformanceCycleBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GoalCreate(BaseModel):
    employee_id: uuid.UUID
    cycle_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    metric_kpi: str | None = None
    target_value: str | None = None
    current_value: str | None = None
    weightage: int = 100

class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    metric_kpi: str | None = None
    target_value: str | None = None
    current_value: str | None = None
    progress_percentage: int | None = None
    weightage: int | None = None
    status: str | None = None

class GoalResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID
    cycle_id: uuid.UUID | None
    title: str
    description: str | None
    metric_kpi: str | None
    target_value: str | None
    current_value: str | None
    progress_percentage: int
    weightage: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PerformanceReviewCreate(BaseModel):
    cycle_id: uuid.UUID
    employee_id: uuid.UUID
    reviewer_id: uuid.UUID | None = None
    self_rating: float | None = None
    self_feedback: str | None = None

class PerformanceReviewUpdate(BaseModel):
    self_rating: float | None = None
    manager_rating: float | None = None
    final_rating: float | None = None
    self_feedback: str | None = None
    manager_feedback: str | None = None
    status: str | None = None

class PerformanceReviewResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    cycle_id: uuid.UUID
    employee_id: uuid.UUID
    reviewer_id: uuid.UUID | None
    self_rating: float | None
    manager_rating: float | None
    final_rating: float | None
    self_feedback: str | None
    manager_feedback: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
