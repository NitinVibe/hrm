import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.designation import Designation
from app.models.user import User
from app.schemas.designation import (
    DesignationCreate,
    DesignationResponse,
    DesignationUpdate,
)

router = APIRouter(
    prefix="/designations",
    tags=["Designations"],
)


@router.post(
    "",
    response_model=DesignationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_designation(
    data: DesignationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    designation = Designation(
        organization_id=current_user.organization_id,
        name=data.name,
        description=data.description,
    )

    db.add(designation)
    db.commit()
    db.refresh(designation)

    return designation


@router.get(
    "",
    response_model=list[DesignationResponse],
)
def get_designations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    designations = db.scalars(
        select(Designation)
        .where(
            Designation.organization_id == current_user.organization_id
        )
        .order_by(Designation.name)
    ).all()

    return designations


@router.get(
    "/{designation_id}",
    response_model=DesignationResponse,
)
def get_designation(
    designation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    designation = db.scalar(
        select(Designation).where(
            Designation.id == designation_id,
            Designation.organization_id == current_user.organization_id,
        )
    )

    if not designation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designation not found",
        )

    return designation


@router.patch(
    "/{designation_id}",
    response_model=DesignationResponse,
)
def update_designation(
    designation_id: uuid.UUID,
    data: DesignationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    designation = db.scalar(
        select(Designation).where(
            Designation.id == designation_id,
            Designation.organization_id == current_user.organization_id,
        )
    )

    if not designation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designation not found",
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(designation, field, value)

    db.commit()
    db.refresh(designation)

    return designation


@router.delete(
    "/{designation_id}",
    response_model=DesignationResponse,
)
def deactivate_designation(
    designation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    designation = db.scalar(
        select(Designation).where(
            Designation.id == designation_id,
            Designation.organization_id == current_user.organization_id,
        )
    )

    if not designation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designation not found",
        )

    designation.is_active = False

    db.commit()
    db.refresh(designation)

    return designation