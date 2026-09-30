import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"  # low, normal, urgent
    expires_at: datetime | None = None

class AnnouncementResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    content: str
    priority: str
    published_by_id: uuid.UUID | None
    is_active: bool
    created_at: datetime
    expires_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    type: str
    link: str | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
