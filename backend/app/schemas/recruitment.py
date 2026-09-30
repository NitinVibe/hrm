import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

class JobOpeningBase(BaseModel):
    title: str
    department_id: uuid.UUID | None = None
    location: str | None = None
    employment_type: str = "full_time"
    open_positions: int = 1
    status: str = "published"
    description: str | None = None
    requirements: str | None = None

class JobOpeningCreate(JobOpeningBase):
    pass

class JobOpeningUpdate(BaseModel):
    title: str | None = None
    department_id: uuid.UUID | None = None
    location: str | None = None
    employment_type: str | None = None
    open_positions: int | None = None
    status: str | None = None
    description: str | None = None
    requirements: str | None = None

class JobOpeningResponse(JobOpeningBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CandidateCreate(BaseModel):
    job_id: uuid.UUID
    first_name: str
    last_name: str | None = None
    email: EmailStr
    phone: str | None = None
    resume_url: str | None = None
    notes: str | None = None

class CandidateStageUpdate(BaseModel):
    stage: str
    notes: str | None = None

class CandidateConvertToEmployee(BaseModel):
    department_id: uuid.UUID | None = None
    designation_id: uuid.UUID | None = None
    shift_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None

class CandidateResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    job_id: uuid.UUID
    first_name: str
    last_name: str | None
    email: str
    phone: str | None
    resume_url: str | None
    stage: str
    applied_at: datetime
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InterviewCreate(BaseModel):
    candidate_id: uuid.UUID
    interviewer_id: uuid.UUID | None = None
    round_name: str
    scheduled_at: datetime

class InterviewUpdate(BaseModel):
    round_name: str | None = None
    scheduled_at: datetime | None = None
    status: str | None = None
    rating: float | None = None
    feedback: str | None = None

class InterviewResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    candidate_id: uuid.UUID
    interviewer_id: uuid.UUID | None
    round_name: str
    scheduled_at: datetime
    status: str
    rating: float | None
    feedback: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
