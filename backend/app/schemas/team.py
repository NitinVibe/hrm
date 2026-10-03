from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    department_id: UUID | None = None
    manager_id: UUID | None = None
    description: str | None = None
    is_active: bool = True


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    department_id: UUID | None = None
    manager_id: UUID | None = None
    description: str | None = None
    is_active: bool | None = None


class TeamResponse(BaseModel):
    id: UUID
    organization_id: UUID
    department_id: UUID | None = None
    manager_id: UUID | None = None
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    department_name: str | None = None
    manager_name: str | None = None
    member_count: int = 0

    model_config = ConfigDict(from_attributes=True)
