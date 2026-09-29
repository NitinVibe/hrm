import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.department import Department
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    department = Department(
        organization_id=current_user.organization_id,
        name=data.name,
        description=data.description,
    )

    db.add(department)
    db.commit()
    db.refresh(department)

    return department


@router.get(
    "",
    response_model=list[DepartmentResponse],
)
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    departments = db.scalars(
        select(Department)
        .where(
            Department.organization_id == current_user.organization_id
        )
        .order_by(Department.name)
    ).all()

    return departments


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def get_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.organization_id == current_user.organization_id,
        )
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    return department


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def update_department(
    department_id: uuid.UUID,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.organization_id == current_user.organization_id,
        )
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(department, field, value)

    db.commit()
    db.refresh(department)

    return department


@router.delete(
    "/{department_id}",
    response_model=DepartmentResponse,
)
def deactivate_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.organization_id == current_user.organization_id,
        )
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    department.is_active = False

    db.commit()
    db.refresh(department)

    return department