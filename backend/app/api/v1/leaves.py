import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.employee import Employee
from app.models.leave import Leave
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveResponse
from app.models.attendance import Attendance

router = APIRouter(
    prefix="/leaves",
    tags=["Leave Management"],
)


# =========================================================
# CREATE LEAVE REQUEST
# =========================================================

@router.post(
    "",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_leave(
    data: LeaveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check employee belongs to current organization
    employee = db.scalar(
        select(Employee).where(
            Employee.id == data.employee_id,
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
    # Validate dates
    # -----------------------------------------------------

    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date.",
        )

    # -----------------------------------------------------
    # Check existing attendance
    # -----------------------------------------------------

    existing_attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == data.employee_id,
            Attendance.organization_id
            == current_user.organization_id,
            Attendance.attendance_date >= data.start_date,
            Attendance.attendance_date <= data.end_date,
        )
    )

    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already exists for one or more leave dates.",
        )

    # -----------------------------------------------------
    # Check overlapping leave
    # -----------------------------------------------------

    overlapping_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == data.employee_id,
            Leave.organization_id
            == current_user.organization_id,
            Leave.status.in_(["pending", "approved"]),
            Leave.start_date <= data.end_date,
            Leave.end_date >= data.start_date,
        )
    )

    if overlapping_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request overlaps with an existing leave.",
        )

    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already exists for one or more leave dates.",
        )

    overlapping_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == data.employee_id,
            Leave.organization_id == current_user.organization_id,
            Leave.status.in_(["pending", "approved"]),
            Leave.start_date <= data.end_date,
            Leave.end_date >= data.start_date,
        )
    )

    if overlapping_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request overlaps with an existing leave.",
        )

    leave = Leave(
        organization_id=current_user.organization_id,
        employee_id=data.employee_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status="pending",
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return leave


# =========================================================
# LIST LEAVES
# =========================================================

@router.get(
    "",
    response_model=list[LeaveResponse],
)
def list_leaves(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leaves = db.scalars(
        select(Leave)
        .where(
            Leave.organization_id
            == current_user.organization_id,
        )
        .order_by(Leave.created_at.desc())
    ).all()

    return leaves


# =========================================================
# GET SINGLE LEAVE
# =========================================================

@router.get(
    "/{leave_id}",
    response_model=LeaveResponse,
)
def get_leave(
    leave_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id
            == current_user.organization_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    return leave


# =========================================================
# APPROVE LEAVE
# =========================================================

@router.patch(
    "/{leave_id}/approve",
    response_model=LeaveResponse,
)
def approve_leave(
    leave_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id
            == current_user.organization_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be approved.",
        )

    leave.status = "approved"
    leave.approved_by = current_user.id

    db.commit()
    db.refresh(leave)

    return leave


# =========================================================
# REJECT LEAVE
# =========================================================

@router.patch(
    "/{leave_id}/reject",
    response_model=LeaveResponse,
)
def reject_leave(
    leave_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id
            == current_user.organization_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be rejected.",
        )

    leave.status = "rejected"
    leave.approved_by = current_user.id

    db.commit()
    db.refresh(leave)

    return leave