import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.holiday import Holiday
from app.models.user import User
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse

router = APIRouter(prefix="/holidays", tags=["Holidays"])

@router.get("", response_model=list[HolidayResponse])
def list_holidays(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    holidays = db.scalars(
        select(Holiday)
        .where(Holiday.organization_id == current_user.organization_id)
        .order_by(Holiday.holiday_date)
    ).all()
    return holidays

@router.post("", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(
    data: HolidayCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    holiday = Holiday(
        organization_id=current_user.organization_id,
        name=data.name.strip(),
        holiday_date=data.holiday_date,
        description=data.description,
        is_optional=data.is_optional,
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.patch("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(
    holiday_id: uuid.UUID,
    data: HolidayUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    h = db.scalar(
        select(Holiday).where(
            Holiday.id == holiday_id,
            Holiday.organization_id == current_user.organization_id,
        )
    )
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(h, field, val)

    h.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(h)
    return h

@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    h = db.scalar(
        select(Holiday).where(
            Holiday.id == holiday_id,
            Holiday.organization_id == current_user.organization_id,
        )
    )
    if not h:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found.")

    db.delete(h)
    db.commit()
    return None

