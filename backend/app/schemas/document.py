import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class DocumentCreate(BaseModel):
    title: str
    category: str = "other"  # identity, offer_letter, contract, policy, certificate, other
    file_url: str
    file_size_kb: int = 0
    employee_id: uuid.UUID | None = None
    expiry_date: date | None = None

class DocumentVerify(BaseModel):
    verification_status: str  # verified, rejected

class DocumentResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID | None
    title: str
    category: str
    file_url: str
    file_size_kb: int
    expiry_date: date | None
    verification_status: str
    uploaded_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
