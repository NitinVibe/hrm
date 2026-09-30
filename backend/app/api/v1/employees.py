import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_org_admin
from app.core.security import hash_password
from app.db.dependencies import get_db

from app.models.employee import Employee
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.models.designation import Designation
from app.models.shift import Shift
from app.models.branch import Branch
from app.services.audit import log_audit

from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    CreateAccountRequest,
)

router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
)

@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id

    # 1. Validate Department
    if data.department_id:
        dept = db.scalar(
            select(Department).where(
                Department.id == data.department_id,
                Department.organization_id == org_id,
            )
        )
        if not dept:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department.")

    # 2. Validate Designation
    if data.designation_id:
        desig = db.scalar(
            select(Designation).where(
                Designation.id == data.designation_id,
                Designation.organization_id == org_id,
            )
        )
        if not desig:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid designation.")

    # 3. Validate Shift
    if data.shift_id:
        sh = db.scalar(
            select(Shift).where(
                Shift.id == data.shift_id,
                Shift.organization_id == org_id,
            )
        )
        if not sh:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shift.")

    # 4. Validate Branch
    if data.branch_id:
        br = db.scalar(
            select(Branch).where(
                Branch.id == data.branch_id,
                Branch.organization_id == org_id,
            )
        )
        if not br:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid branch.")

    # 5. Check if email already used by another employee
    if data.email:
        existing_emp_email = db.scalar(
            select(Employee).where(
                Employee.organization_id == org_id,
                Employee.email == data.email.lower().strip(),
            )
        )
        if existing_emp_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An employee with this email already exists.")

    employee_code = f"EMP-{uuid.uuid4().hex[:8].upper()}"

    # 6. Optional: Create Login Account if requested
    user_id = data.user_id
    if data.create_login_account and not user_id:
        if not data.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required to create a login account.")
        
        # Check if user email already exists
        existing_user = db.scalar(select(User).where(User.email == data.email.lower().strip()))
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user account with this email already exists.")

        target_role_name = (data.account_role or "EMPLOYEE").upper()
        role = db.scalar(select(Role).where(Role.name == target_role_name))
        if not role:
            role = db.scalar(select(Role).where(Role.name == "EMPLOYEE"))

        temp_pass = data.temporary_password or "Welcome@123"
        new_user = User(
            organization_id=org_id,
            role_id=role.id if role else None,
            email=data.email.lower().strip(),
            password_hash=hash_password(temp_pass),
            is_active=True,
            is_verified=True,
        )
        db.add(new_user)
        db.flush()
        user_id = new_user.id

    employee = Employee(
        organization_id=org_id,
        employee_code=employee_code,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip() if data.last_name else None,
        email=data.email.lower().strip() if data.email else None,
        phone=data.phone.strip() if data.phone else None,
        date_of_birth=data.date_of_birth,
        joining_date=data.joining_date,
        employment_status=data.employment_status,
        employment_type=data.employment_type or "Full-Time",
        department_id=data.department_id,
        designation_id=data.designation_id,
        shift_id=data.shift_id,
        branch_id=data.branch_id,
        reporting_manager_id=data.reporting_manager_id,
        user_id=user_id,
        gender=data.gender,
        marital_status=data.marital_status,
        blood_group=data.blood_group,
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        emergency_contact_relation=data.emergency_contact_relation,
        bank_name=data.bank_name,
        account_number=data.account_number,
        ifsc_code=data.ifsc_code,
        pan_number=data.pan_number,
        aadhar_number=data.aadhar_number,
    )

    db.add(employee)
    db.flush()

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="CREATE_EMPLOYEE",
        entity_type="employee",
        entity_id=str(employee.id),
        details={"employee_code": employee.employee_code, "has_account": bool(user_id)},
    )

    db.commit()
    db.refresh(employee)
    return employee

@router.get("", response_model=list[EmployeeResponse])
def list_employees(
    department_id: uuid.UUID | None = None,
    branch_id: uuid.UUID | None = None,
    reporting_manager_id: uuid.UUID | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Employee).where(Employee.organization_id == current_user.organization_id)
    if department_id:
        query = query.where(Employee.department_id == department_id)
    if branch_id:
        query = query.where(Employee.branch_id == branch_id)
    if reporting_manager_id:
        query = query.where(Employee.reporting_manager_id == reporting_manager_id)
    if status:
        query = query.where(Employee.employment_status == status)

    return db.scalars(query.order_by(Employee.first_name, Employee.last_name)).all()

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return emp

@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, val)

    emp.updated_at = datetime.utcnow()
    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPDATE_EMPLOYEE",
        entity_type="employee",
        entity_id=str(emp.id),
        details={"name": f"{emp.first_name} {emp.last_name}"},
    )

    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    emp.employment_status = "inactive"
    # Deactivate linked user account if exists
    if emp.user_id:
        u = db.scalar(select(User).where(User.id == emp.user_id))
        if u:
            u.is_active = False

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DEACTIVATE_EMPLOYEE",
        entity_type="employee",
        entity_id=str(emp.id),
    )

    db.commit()
    return None

@router.post("/{employee_id}/create-account")
def create_login_account_for_employee(
    employee_id: uuid.UUID,
    data: CreateAccountRequest,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    if not emp.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee has no email address. Please update employee email first.")

    if emp.user_id:
        existing_u = db.scalar(select(User).where(User.id == emp.user_id))
        if existing_u:
            # Reset password
            existing_u.password_hash = hash_password(data.password)
            existing_u.is_active = True
            db.commit()
            return {
                "message": "Employee password updated successfully!",
                "username": emp.employee_code,
                "email": emp.email,
            }

    # Check if email taken
    existing_by_email = db.scalar(select(User).where(User.email == emp.email.lower()))
    if existing_by_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account with this email already exists.")

    target_role = (data.role or "EMPLOYEE").upper()
    role = db.scalar(select(Role).where(Role.name == target_role))
    if not role:
        role = db.scalar(select(Role).where(Role.name == "EMPLOYEE"))

    user = User(
        organization_id=current_user.organization_id,
        role_id=role.id if role else None,
        email=emp.email.lower().strip(),
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    emp.user_id = user.id
    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE_LOGIN_ACCOUNT",
        entity_type="user",
        entity_id=str(user.id),
        details={"employee_code": emp.employee_code, "role": target_role},
    )

    db.commit()
    return {
        "message": "Login account successfully created for employee!",
        "username": emp.employee_code,
        "email": emp.email,
        "role": target_role,
    }