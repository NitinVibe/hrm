import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import (
    ShiftCreate,
    ShiftResponse,
    ShiftUpdate,
)


router = APIRouter(
    prefix="/shifts",
    tags=["Shifts"],
)


# =========================================================
# CREATE SHIFT
# =========================================================

@router.post(
    "",
    response_model=ShiftResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shift(
    data: ShiftCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    if data.start_time == data.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time and end time cannot be the same.",
        )

    shift = Shift(
        organization_id=current_user.organization_id,
        name=data.name,
        start_time=data.start_time,
        end_time=data.end_time,
        grace_minutes=data.grace_minutes,
    )

    db.add(shift)
    db.commit()
    db.refresh(shift)

    return shift


# =========================================================
# LIST SHIFTS
# =========================================================

@router.get(
    "",
    response_model=list[ShiftResponse],
)
def list_shifts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shifts = db.scalars(
        select(Shift)
        .where(
            Shift.organization_id
            == current_user.organization_id
        )
        .order_by(Shift.name)
    ).all()

    return shifts


# =========================================================
# GET SINGLE SHIFT
# =========================================================

@router.get(
    "/{shift_id}",
    response_model=ShiftResponse,
)
def get_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shift = db.scalar(
        select(Shift).where(
            Shift.id == shift_id,
            Shift.organization_id
            == current_user.organization_id,
        )
    )

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found.",
        )

    return shift


# =========================================================
# UPDATE SHIFT
# =========================================================

@router.patch(
    "/{shift_id}",
    response_model=ShiftResponse,
)
def update_shift(
    shift_id: uuid.UUID,
    data: ShiftUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    shift = db.scalar(
        select(Shift).where(
            Shift.id == shift_id,
            Shift.organization_id
            == current_user.organization_id,
        )
    )

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found.",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    new_start = update_data.get(
        "start_time",
        shift.start_time,
    )

    new_end = update_data.get(
        "end_time",
        shift.end_time,
    )

    if new_start == new_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time and end time cannot be the same.",
        )

    for field, value in update_data.items():
        setattr(shift, field, value)

    db.commit()
    db.refresh(shift)

    return shift


# =========================================================
# DEACTIVATE SHIFT
# =========================================================

@router.delete(
    "/{shift_id}",
    response_model=ShiftResponse,
)
def deactivate_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    shift = db.scalar(
        select(Shift).where(
            Shift.id == shift_id,
            Shift.organization_id
            == current_user.organization_id,
        )
    )

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found.",
        )

    shift.is_active = False

    db.commit()
    db.refresh(shift)

    return shift