from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    joining_date: date | None = None
    employment_status: str = Field(default="active", max_length=30)
    employment_type: str = Field(default="Full-Time", max_length=50)

    department_id: UUID | None = None
    designation_id: UUID | None = None
    shift_id: UUID | None = None
    branch_id: UUID | None = None
    reporting_manager_id: UUID | None = None
    user_id: UUID | None = None

    gender: str | None = None
    marital_status: str | None = None
    blood_group: str | None = None

    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None

    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    pan_number: str | None = None
    aadhar_number: str | None = None

    create_login_account: bool = False
    temporary_password: str | None = None
    account_role: str = "EMPLOYEE"


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    joining_date: date | None = None
    employment_status: str | None = Field(default=None, max_length=30)
    employment_type: str | None = Field(default=None, max_length=50)

    department_id: UUID | None = None
    designation_id: UUID | None = None
    shift_id: UUID | None = None
    branch_id: UUID | None = None
    reporting_manager_id: UUID | None = None
    user_id: UUID | None = None

    gender: str | None = None
    marital_status: str | None = None
    blood_group: str | None = None

    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None

    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    pan_number: str | None = None
    aadhar_number: str | None = None


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
    employment_type: str | None = "Full-Time"

    department_id: UUID | None = None
    designation_id: UUID | None = None
    shift_id: UUID | None = None
    branch_id: UUID | None = None
    reporting_manager_id: UUID | None = None
    user_id: UUID | None = None

    gender: str | None = None
    marital_status: str | None = None
    blood_group: str | None = None

    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None

    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    pan_number: str | None = None
    aadhar_number: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CreateAccountRequest(BaseModel):
    password: str = Field(min_length=6)
    role: str = "EMPLOYEE"