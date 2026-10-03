import calendar
import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_org_admin, require_employee
from app.db.dependencies import get_db
from app.models.payroll import SalaryStructure, EmployeeSalary, PayrollRun, Payslip
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.leave import Leave
from app.models.role import Role
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
from app.services.notifications import send_notification

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
@router.post("/runs/process", response_model=PayrollRunResponse)
@router.post("/runs", response_model=PayrollRunResponse)
@router.post("/process", response_model=PayrollRunResponse)
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

    # Calculate month calendar boundaries and total working days (Mon-Fri)
    num_days = calendar.monthrange(data.year, data.month)[1]
    start_dt = date(data.year, data.month, 1)
    end_dt = date(data.year, data.month, num_days)
    calendar_working_days = sum(
        1 for d in range(1, num_days + 1)
        if date(data.year, data.month, d).weekday() < 5
    )
    month_working_days = calendar_working_days if calendar_working_days > 0 else 22

    # Check for default salary structure in org in case an employee lacks an active EmployeeSalary
    default_structure = db.scalar(
        select(SalaryStructure).where(
            SalaryStructure.organization_id == org_id,
            SalaryStructure.is_active == True,
        ).order_by(SalaryStructure.base_annual_ctc.asc())
    )

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
        if not salary_rec:
            # If no salary record, initialize one from default structure or baseline
            monthly_ctc = (default_structure.base_annual_ctc / 12.0) if default_structure else 60000.0
            basic_calc = round(monthly_ctc * 0.50, 2)
            hra_calc = round(monthly_ctc * 0.25, 2)
            conveyance_calc = round(monthly_ctc * 0.10, 2)
            special_calc = round(monthly_ctc * 0.15, 2)
            pf_calc = round(basic_calc * 0.12, 2)
            esi_calc = round(monthly_ctc * 0.0075, 2)
            tax_calc = round(monthly_ctc * 0.05, 2)
            gross_calc = round(basic_calc + hra_calc + conveyance_calc + special_calc, 2)
            net_calc = round(gross_calc - pf_calc - esi_calc - tax_calc, 2)

            salary_rec = EmployeeSalary(
                organization_id=org_id,
                employee_id=emp.id,
                effective_date=start_dt,
                basic_salary=basic_calc,
                hra=hra_calc,
                conveyance_allowance=conveyance_calc,
                special_allowance=special_calc,
                pf_deduction=pf_calc,
                esi_deduction=esi_calc,
                tds_tax_deduction=tax_calc,
                gross_salary=gross_calc,
                net_salary=net_calc,
                is_active=True,
            )
            db.add(salary_rec)
            db.flush()

        # Query real present days from Attendance table
        present_count = db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.organization_id == org_id,
                Attendance.employee_id == emp.id,
                Attendance.attendance_date >= start_dt,
                Attendance.attendance_date <= end_dt,
                Attendance.status.in_(["present", "late"]),
            )
        ) or 0

        # Query real approved leave days from Leave table
        approved_leaves = db.scalars(
            select(Leave).where(
                Leave.organization_id == org_id,
                Leave.employee_id == emp.id,
                Leave.status == "approved",
                Leave.start_date <= end_dt,
                Leave.end_date >= start_dt,
            )
        ).all()

        leave_days_count = 0.0
        for lv in approved_leaves:
            overlap_start = max(lv.start_date, start_dt)
            overlap_end = min(lv.end_date, end_dt)
            if lv.is_half_day:
                leave_days_count += 0.5
            else:
                leave_days_count += float((overlap_end - overlap_start).days + 1)

        # Determine payable days & ratio
        if present_count == 0 and leave_days_count == 0:
            actual_present = month_working_days
            actual_leaves = 0
            payable_days = float(month_working_days)
        else:
            actual_present = int(present_count)
            actual_leaves = int(leave_days_count)
            payable_days = min(float(present_count) + float(leave_days_count), float(month_working_days))

        pay_ratio = max(0.1, min(1.0, payable_days / float(month_working_days)))

        basic = round(salary_rec.basic_salary * pay_ratio, 2)
        hra = round(salary_rec.hra * pay_ratio, 2)
        allowances = round((salary_rec.conveyance_allowance + salary_rec.special_allowance) * pay_ratio, 2)
        emp_gross = round(basic + hra + allowances, 2)

        pf = round(salary_rec.pf_deduction * pay_ratio, 2)
        tax = round(salary_rec.tds_tax_deduction * pay_ratio, 2)
        other_ded = round(salary_rec.esi_deduction * pay_ratio, 2)
        emp_deductions = round(pf + tax + other_ded, 2)
        emp_net = max(0.0, round(emp_gross - emp_deductions, 2))

        total_gross += emp_gross
        total_deductions += emp_deductions
        total_net += emp_net

        payslip = Payslip(
            organization_id=org_id,
            payroll_run_id=payroll_run.id,
            employee_id=emp.id,
            month=data.month,
            year=data.year,
            working_days=month_working_days,
            present_days=actual_present,
            leave_days=actual_leaves,
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
        emp = db.scalar(select(Employee).where(Employee.id == s.employee_id))
        if emp and emp.user_id:
            send_notification(
                db,
                current_user.organization_id,
                emp.user_id,
                "Payslip Ready",
                f"Your payslip for {pr.month}/{pr.year} is now available.",
                "payroll",
                "/self-service",
            )

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

@router.patch("/runs/{run_id}/pay", response_model=PayrollRunResponse)
def mark_payroll_paid(
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

    pr.status = "paid"
    slips = db.scalars(select(Payslip).where(Payslip.payroll_run_id == pr.id)).all()
    now = datetime.utcnow()
    for s in slips:
        s.status = "paid"
        if not s.paid_at:
            s.paid_at = now

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="PAY_PAYROLL",
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

    role = db.scalar(select(Role).where(Role.id == current_user.role_id))
    role_name = role.name.upper() if role else "EMPLOYEE"

    if role_name == "EMPLOYEE":
        user_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not user_emp:
            return []
        query = query.where(Payslip.employee_id == user_emp.id)
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not mgr_emp:
            return []
        sub_ids = db.scalars(
            select(Employee.id).where(
                Employee.organization_id == current_user.organization_id,
                Employee.reporting_manager_id == mgr_emp.id,
            )
        ).all()
        allowed_ids = set(sub_ids) | {mgr_emp.id}
        if employee_id:
            if employee_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only view payslips for their team.",
                )
            query = query.where(Payslip.employee_id == employee_id)
        else:
            query = query.where(Payslip.employee_id.in_(allowed_ids))
    else:
        # HR / ORG_ADMIN / SUPER_ADMIN
        if employee_id:
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

    role = db.scalar(select(Role).where(Role.id == current_user.role_id))
    role_name = role.name.upper() if role else "EMPLOYEE"

    if role_name == "EMPLOYEE":
        user_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not user_emp or user_emp.id != p.employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only view their own payslips.",
            )
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not mgr_emp:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager profile not found.")
        if p.employee_id != mgr_emp.id:
            sub = db.scalar(
                select(Employee).where(
                    Employee.id == p.employee_id,
                    Employee.reporting_manager_id == mgr_emp.id,
                    Employee.organization_id == current_user.organization_id,
                )
            )
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only view payslips for their direct reports.",
                )

    return p

