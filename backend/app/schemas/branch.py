import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BranchBase(BaseModel):
    name: str
    code: str
    city: str | None = None
    state: str | None = None
    country: str = "India"
    address: str | None = None
    timezone: str = "UTC"
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    address: str | None = None
    timezone: str | None = None
    is_active: bool | None = None

class BranchResponse(BranchBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
