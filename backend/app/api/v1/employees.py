import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db

from app.models.employee import Employee
from app.models.user import User
from app.models.department import Department
from app.models.designation import Designation
from app.models.shift import Shift

from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
)


# =========================================================
# CREATE EMPLOYEE
# =========================================================

@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Check Department
    # -----------------------------------------------------

    if data.department_id:
        department = db.scalar(
            select(Department).where(
                Department.id == data.department_id,
                Department.organization_id
                == current_user.organization_id,
                Department.is_active.is_(True),
            )
        )

        if not department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive department.",
            )

    # -----------------------------------------------------
    # Check Designation
    # -----------------------------------------------------

    if data.designation_id:
        designation = db.scalar(
            select(Designation).where(
                Designation.id == data.designation_id,
                Designation.organization_id
                == current_user.organization_id,
                Designation.is_active.is_(True),
            )
        )

        if not designation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive designation.",
            )
    # -----------------------------------------------------
    # Check Shift
    # -----------------------------------------------------

    if data.shift_id:
        shift = db.scalar(
            select(Shift).where(
                Shift.id == data.shift_id,
                Shift.organization_id
                == current_user.organization_id,
                Shift.is_active.is_(True),
            )
        )

        if not shift:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive shift.",
            )



        # -----------------------------------------------------
    # Check User
    # -----------------------------------------------------

    if data.user_id:
        user = db.scalar(
            select(User).where(
                User.id == data.user_id,
                User.organization_id
                == current_user.organization_id,
            )
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user or user belongs to another organization.",
            )

        existing_employee = db.scalar(
            select(Employee).where(
                Employee.user_id == data.user_id,
            )
        )

        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is already linked to an employee.",
            )
    # -----------------------------------------------------
    # Generate Employee Code
    # -----------------------------------------------------

    employee_code = f"EMP-{uuid.uuid4().hex[:8].upper()}"

    # -----------------------------------------------------
    # Create Employee
    # -----------------------------------------------------

    employee = Employee(
        organization_id=current_user.organization_id,
        employee_code=employee_code,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        joining_date=data.joining_date,
        employment_status=data.employment_status,
        department_id=data.department_id,
        designation_id=data.designation_id,
        shift_id=data.shift_id,
        user_id=data.user_id,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


# =========================================================
# LIST EMPLOYEES
# =========================================================

@router.get(
    "",
    response_model=list[EmployeeResponse],
)
def list_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employees = db.scalars(
        select(Employee)
        .where(
            Employee.organization_id
            == current_user.organization_id
        )
        .order_by(Employee.created_at.desc())
    ).all()

    return employees


# =========================================================
# GET SINGLE EMPLOYEE
# =========================================================

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
)
def get_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id
            == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    return employee


# =========================================================
# UPDATE EMPLOYEE
# =========================================================

@router.patch(
    "/{employee_id}",
    response_model=EmployeeResponse,
)
def update_employee(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Find employee inside current organization
    # -----------------------------------------------------

    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id
            == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    # -----------------------------------------------------
    # Get only fields sent by client
    # -----------------------------------------------------

    update_data = data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # Validate Department if it is being changed
    # -----------------------------------------------------

    if "department_id" in update_data:

        department_id = update_data["department_id"]

        # None means remove department assignment
        if department_id is not None:

            department = db.scalar(
                select(Department).where(
                    Department.id == department_id,
                    Department.organization_id
                    == current_user.organization_id,
                    Department.is_active.is_(True),
                )
            )

            if not department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive department.",
                )

    # -----------------------------------------------------
    # Validate Designation if it is being changed
    # -----------------------------------------------------

    if "designation_id" in update_data:

        designation_id = update_data["designation_id"]

        # None means remove designation assignment
        if designation_id is not None:

            designation = db.scalar(
                select(Designation).where(
                    Designation.id == designation_id,
                    Designation.organization_id
                    == current_user.organization_id,
                    Designation.is_active.is_(True),
                )
            )

            if not designation:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive designation.",
                )
            

    # -----------------------------------------------------
    # Validate Shift if it is being changed
    # -----------------------------------------------------

    if "shift_id" in update_data:

        shift_id = update_data["shift_id"]

        # None means remove shift assignment
        if shift_id is not None:

            shift = db.scalar(
                select(Shift).where(
                    Shift.id == shift_id,
                    Shift.organization_id
                    == current_user.organization_id,
                    Shift.is_active.is_(True),
                )
            )

            if not shift:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive shift.",
                )


        # -----------------------------------------------------
    # Validate User if it is being changed
    # -----------------------------------------------------

    if "user_id" in update_data:

        user_id = update_data["user_id"]

        # None means remove user assignment
        if user_id is not None:

            user = db.scalar(
                select(User).where(
                    User.id == user_id,
                    User.organization_id
                    == current_user.organization_id,
                )
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user or user belongs to another organization.",
                )

            existing_employee = db.scalar(
                select(Employee).where(
                    Employee.user_id == user_id,
                    Employee.id != employee.id,
                )
            )

            if existing_employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This user is already linked to another employee.",
                )

    # -----------------------------------------------------
    # Apply changes
    # -----------------------------------------------------

    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return employee


# =========================================================
# DEACTIVATE EMPLOYEE
# =========================================================

@router.delete(
    "/{employee_id}",
    response_model=EmployeeResponse,
)
def deactivate_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id
            == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    # Soft delete
    employee.employment_status = "inactive"

    db.commit()
    db.refresh(employee)

    return employee