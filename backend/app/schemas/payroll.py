import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class SalaryStructureBase(BaseModel):
    name: str
    description: str | None = None
    base_annual_ctc: float = 0.0
    is_active: bool = True

class SalaryStructureCreate(SalaryStructureBase):
    pass

class SalaryStructureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    base_annual_ctc: float | None = None
    is_active: bool | None = None

class SalaryStructureResponse(SalaryStructureBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EmployeeSalaryCreate(BaseModel):
    employee_id: uuid.UUID
    effective_date: date
    basic_salary: float
    hra: float = 0.0
    conveyance_allowance: float = 0.0
    special_allowance: float = 0.0
    pf_deduction: float = 0.0
    esi_deduction: float = 0.0
    tds_tax_deduction: float = 0.0

class EmployeeSalaryResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    employee_id: uuid.UUID
    effective_date: date
    basic_salary: float
    hra: float
    conveyance_allowance: float
    special_allowance: float
    pf_deduction: float
    esi_deduction: float
    tds_tax_deduction: float
    gross_salary: float
    net_salary: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PayrollRunProcess(BaseModel):
    month: int
    year: int
    notes: str | None = None

class PayrollRunResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    month: int
    year: int
    total_gross: float
    total_net: float
    total_deductions: float
    status: str
    notes: str | None
    processed_by_id: uuid.UUID | None
    processed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PayslipResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    payroll_run_id: uuid.UUID
    employee_id: uuid.UUID
    month: int
    year: int
    working_days: int
    present_days: int
    leave_days: int
    basic_salary: float
    hra: float
    allowances: float
    gross_salary: float
    pf_deduction: float
    tax_deduction: float
    other_deductions: float
    net_salary: float
    status: str
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
