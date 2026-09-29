from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ShiftCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    start_time: time
    end_time: time
    grace_minutes: int = Field(default=15, ge=0, le=1440)


class ShiftUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    start_time: time | None = None
    end_time: time | None = None
    grace_minutes: int | None = Field(
        default=None,
        ge=0,
        le=1440,
    )
    is_active: bool | None = None


class ShiftResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    start_time: time
    end_time: time
    grace_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)