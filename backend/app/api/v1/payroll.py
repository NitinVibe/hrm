import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_org_admin, require_employee
from app.db.dependencies import get_db
from app.models.payroll import SalaryStructure, EmployeeSalary, PayrollRun, Payslip
from app.models.employee import Employee
from app.models.user import User
from app.schemas.payroll import (
    SalaryStructureCreate,
    SalaryStructureUpdate,
    SalaryStructureResponse,
    EmployeeSalaryCreate,
    EmployeeSalaryResponse,
    PayrollRunProcess,
    PayrollRunResponse,
    PayslipResponse,
)
from app.services.audit import log_audit

router = APIRouter(prefix="/payroll", tags=["Payroll & Compensation"])

# --- Salary Structures ---
@router.get("/structures", response_model=list[SalaryStructureResponse])
def list_salary_structures(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(SalaryStructure)
        .where(SalaryStructure.organization_id == current_user.organization_id)
        .order_by(SalaryStructure.name)
    ).all()

@router.post("/structures", response_model=SalaryStructureResponse, status_code=status.HTTP_201_CREATED)
def create_salary_structure(
    data: SalaryStructureCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    struct = SalaryStructure(
        organization_id=current_user.organization_id,
        name=data.name.strip(),
        description=data.description,
        base_annual_ctc=data.base_annual_ctc,
        is_active=data.is_active,
    )
    db.add(struct)
    db.commit()
    db.refresh(struct)
    return struct

# --- Employee Salaries ---
@router.get("/salaries", response_model=list[EmployeeSalaryResponse])
def list_employee_salaries(
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(EmployeeSalary)
        .where(EmployeeSalary.organization_id == current_user.organization_id)
        .order_by(EmployeeSalary.effective_date.desc())
    ).all()

@router.post("/salaries", response_model=EmployeeSalaryResponse, status_code=status.HTTP_201_CREATED)
def assign_employee_salary(
    data: EmployeeSalaryCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    emp = db.scalar(
        select(Employee).where(
            Employee.id == data.employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    gross = data.basic_salary + data.hra + data.conveyance_allowance + data.special_allowance
    total_deductions = data.pf_deduction + data.esi_deduction + data.tds_tax_deduction
    net = max(0.0, gross - total_deductions)

    # Deactivate existing active salary
    existing = db.scalars(
        select(EmployeeSalary).where(
            EmployeeSalary.organization_id == current_user.organization_id,
            EmployeeSalary.employee_id == data.employee_id,
            EmployeeSalary.is_active == True,
        )
    ).all()
    for es in existing:
        es.is_active = False

    new_salary = EmployeeSalary(
        organization_id=current_user.organization_id,
        employee_id=data.employee_id,
        effective_date=data.effective_date,
        basic_salary=data.basic_salary,
        hra=data.hra,
        conveyance_allowance=data.conveyance_allowance,
        special_allowance=data.special_allowance,
        pf_deduction=data.pf_deduction,
        esi_deduction=data.esi_deduction,
        tds_tax_deduction=data.tds_tax_deduction,
        gross_salary=gross,
        net_salary=net,
        is_active=True,
    )
    db.add(new_salary)
    db.flush()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ASSIGN_SALARY",
        entity_type="employee_salary",
        entity_id=str(new_salary.id),
        details={"employee_id": str(emp.id), "gross": gross, "net": net},
    )

    db.commit()
    db.refresh(new_salary)
    return new_salary

# --- Payroll Runs & Processing ---
@router.get("/runs", response_model=list[PayrollRunResponse])
def list_payroll_runs(
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(PayrollRun)
        .where(PayrollRun.organization_id == current_user.organization_id)
        .order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
    ).all()

@router.post("/process", response_model=PayrollRunResponse, status_code=status.HTTP_201_CREATED)
def process_payroll_run(
    data: PayrollRunProcess,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id

    # Check existing run
    existing_run = db.scalar(
        select(PayrollRun).where(
            PayrollRun.organization_id == org_id,
            PayrollRun.month == data.month,
            PayrollRun.year == data.year,
        )
    )
    if existing_run and existing_run.status == "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payroll run for this period is already approved.")

    if not existing_run:
        payroll_run = PayrollRun(
            organization_id=org_id,
            month=data.month,
            year=data.year,
            total_gross=0.0,
            total_net=0.0,
            total_deductions=0.0,
            status="draft",
            notes=data.notes,
            processed_by_id=current_user.id,
            processed_at=datetime.utcnow(),
        )
        db.add(payroll_run)
        db.flush()
    else:
        payroll_run = existing_run
        payroll_run.notes = data.notes
        payroll_run.processed_at = datetime.utcnow()
        # Clear existing payslips for re-generation
        existing_slips = db.scalars(select(Payslip).where(Payslip.payroll_run_id == payroll_run.id)).all()
        for s in existing_slips:
            db.delete(s)
        db.flush()

    # Fetch all active employees
    active_employees = db.scalars(
        select(Employee).where(
            Employee.organization_id == org_id,
            Employee.employment_status == "active",
        )
    ).all()

    total_gross = 0.0
    total_deductions = 0.0
    total_net = 0.0

    for emp in active_employees:
        salary_rec = db.scalar(
            select(EmployeeSalary).where(
                EmployeeSalary.organization_id == org_id,
                EmployeeSalary.employee_id == emp.id,
                EmployeeSalary.is_active == True,
            )
        )
        basic = salary_rec.basic_salary if salary_rec else 50000.0
        hra = salary_rec.hra if salary_rec else 20000.0
        allowances = (salary_rec.conveyance_allowance + salary_rec.special_allowance) if salary_rec else 15000.0
        emp_gross = basic + hra + allowances

        pf = salary_rec.pf_deduction if salary_rec else (basic * 0.12)
        tax = salary_rec.tds_tax_deduction if salary_rec else (emp_gross * 0.10)
        other_ded = salary_rec.esi_deduction if salary_rec else 0.0
        emp_deductions = pf + tax + other_ded
        emp_net = max(0.0, emp_gross - emp_deductions)

        total_gross += emp_gross
        total_deductions += emp_deductions
        total_net += emp_net

        payslip = Payslip(
            organization_id=org_id,
            payroll_run_id=payroll_run.id,
            employee_id=emp.id,
            month=data.month,
            year=data.year,
            working_days=22,
            present_days=21,
            leave_days=1,
            basic_salary=basic,
            hra=hra,
            allowances=allowances,
            gross_salary=emp_gross,
            pf_deduction=pf,
            tax_deduction=tax,
            other_deductions=other_ded,
            net_salary=emp_net,
            status="generated",
        )
        db.add(payslip)

    payroll_run.total_gross = total_gross
    payroll_run.total_deductions = total_deductions
    payroll_run.total_net = total_net
    payroll_run.status = "processed"

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="PROCESS_PAYROLL",
        entity_type="payroll_run",
        entity_id=str(payroll_run.id),
        details={"month": data.month, "year": data.year, "count": len(active_employees)},
    )

    db.commit()
    db.refresh(payroll_run)
    return payroll_run

@router.patch("/runs/{run_id}/approve", response_model=PayrollRunResponse)
def approve_payroll_run(
    run_id: uuid.UUID,
    current_user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    pr = db.scalar(
        select(PayrollRun).where(
            PayrollRun.id == run_id,
            PayrollRun.organization_id == current_user.organization_id,
        )
    )
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found.")

    pr.status = "approved"
    # Mark payslips as paid
    slips = db.scalars(select(Payslip).where(Payslip.payroll_run_id == pr.id)).all()
    now = datetime.utcnow()
    for s in slips:
        s.status = "paid"
        s.paid_at = now

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="APPROVE_PAYROLL",
        entity_type="payroll_run",
        entity_id=str(pr.id),
        details={"month": pr.month, "year": pr.year},
    )

    db.commit()
    db.refresh(pr)
    return pr

# --- Payslips ---
@router.get("/payslips", response_model=list[PayslipResponse])
def list_payslips(
    employee_id: uuid.UUID | None = None,
    month: int | None = None,
    year: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Payslip).where(Payslip.organization_id == current_user.organization_id)

    # Check if user is an employee (non-HR/non-Admin)
    user_emp = db.scalar(select(Employee).where(Employee.user_id == current_user.id))
    # If the user is a normal employee, force filter to their own records only!
    role = db.scalar(select(User).where(User.id == current_user.id)).role
    if role and role.name == "EMPLOYEE" and user_emp:
        query = query.where(Payslip.employee_id == user_emp.id)
    elif employee_id:
        query = query.where(Payslip.employee_id == employee_id)

    if month:
        query = query.where(Payslip.month == month)
    if year:
        query = query.where(Payslip.year == year)

    query = query.order_by(Payslip.year.desc(), Payslip.month.desc())
    return db.scalars(query).all()

@router.get("/payslips/{payslip_id}", response_model=PayslipResponse)
def get_payslip(
    payslip_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.scalar(
        select(Payslip).where(
            Payslip.id == payslip_id,
            Payslip.organization_id == current_user.organization_id,
        )
    )
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found.")
    return p
