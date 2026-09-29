from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeCreate(BaseModel):
    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str | None = Field(
        default=None,
        max_length=100,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    date_of_birth: date | None = None
    joining_date: date | None = None

    employment_status: str = Field(
        default="active",
        max_length=30,
    )

    department_id: UUID | None = None
    designation_id: UUID | None = None
    shift_id: UUID | None = None
    user_id: UUID | None = None


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    last_name: str | None = Field(
        default=None,
        max_length=100,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    date_of_birth: date | None = None
    joining_date: date | None = None

    employment_status: str | None = Field(
        default=None,
        max_length=30,
    )

    department_id: UUID | None = None
    designation_id: UUID | None = None
    shift_id: UUID | None = None
    user_id: UUID | None = None


class EmployeeResponse(BaseModel):
    id: UUID
    organization_id: UUID
    employee_code: str

    first_name: str
    last_name: str | None

    email: str | None
    phone: str | None

    date_of_birth: date | None
    joining_date: date | None

    employment_status: str

    department_id: UUID | None
    designation_id: UUID | None
    shift_id: UUID | None
    user_id: UUID | None

    model_config = ConfigDict(
        from_attributes=True,
    )