import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class HolidayBase(BaseModel):
    name: str
    holiday_date: date
    description: str | None = None
    is_optional: bool = False

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: str | None = None
    holiday_date: date | None = None
    description: str | None = None
    is_optional: bool | None = None

class HolidayResponse(HolidayBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
