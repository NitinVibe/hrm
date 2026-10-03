from datetime import date, datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.core.permissions import require_employee
from app.db.dependencies import get_db

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.user import User
from app.models.leave import Leave

from app.schemas.attendance import (
    AttendanceResponse,
    AttendanceTodayStatusResponse,
    AttendanceTodayItem,
    EmployeeBrief,
    ShiftBrief,
)


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# =========================================================
# CHECK IN
# =========================================================

@router.post(
    "/check-in/{employee_id}",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def check_in(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Find employee inside current organization
    # -----------------------------------------------------

    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    # -----------------------------------------------------
    # Employee must have a shift
    # -----------------------------------------------------

    if employee.shift is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee does not have an assigned shift.",
        )

    # -----------------------------------------------------
    # Current date and time
    # -----------------------------------------------------

    now = datetime.now()
    today = now.date()
    # -----------------------------------------------------
    # Check approved leave
    # -----------------------------------------------------

    approved_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == employee.id,
            Leave.organization_id == current_user.organization_id,
            Leave.start_date <= today,
            Leave.end_date >= today,
            Leave.status == "approved",
        )
    )

    if approved_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee is on approved leave today.",
        )

    # -----------------------------------------------------
    # Prevent duplicate check-in
    # -----------------------------------------------------

    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.organization_id
            == current_user.organization_id,
            Attendance.attendance_date == today,
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already exists for today.",
        )

    # -----------------------------------------------------
    # Calculate shift start + grace period
    # -----------------------------------------------------

    shift_start = datetime.combine(
        today,
        employee.shift.start_time,
    )

    allowed_until = shift_start + timedelta(
        minutes=employee.shift.grace_minutes
    )

    # -----------------------------------------------------
    # Calculate late minutes
    # -----------------------------------------------------

    late_minutes = 0
    attendance_status = "present"

    if now > allowed_until:
        late_minutes = int(
            (now - shift_start).total_seconds() // 60
        )
        attendance_status = "late"

    # -----------------------------------------------------
    # Create attendance
    # -----------------------------------------------------

    attendance = Attendance(
        organization_id=current_user.organization_id,
        employee_id=employee.id,
        attendance_date=today,
        check_in=now,
        status=attendance_status,
        late_minutes=late_minutes,
        working_minutes=0,
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance


# =========================================================
# CHECK OUT
# =========================================================

@router.post(
    "/check-out/{employee_id}",
    response_model=AttendanceResponse,
)
def check_out(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Find today's attendance
    # -----------------------------------------------------

    today = date.today()

    attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee_id,
            Attendance.organization_id
            == current_user.organization_id,
            Attendance.attendance_date == today,
        )
    )

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Today's attendance not found.",
        )

    # -----------------------------------------------------
    # Check-in required
    # -----------------------------------------------------

    if attendance.check_in is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee has not checked in.",
        )

    # -----------------------------------------------------
    # Prevent duplicate checkout
    # -----------------------------------------------------

    if attendance.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee has already checked out.",
        )

    # -----------------------------------------------------
    # Checkout
    # -----------------------------------------------------

    now = datetime.now()

    attendance.check_out = now

    # -----------------------------------------------------
    # Calculate working minutes
    # -----------------------------------------------------

    working_minutes = int(
        (now - attendance.check_in).total_seconds() // 60
    )

    attendance.working_minutes = max(
        working_minutes,
        0,
    )

    db.commit()
    db.refresh(attendance)

    return attendance


# =========================================================
# LIST ATTENDANCE
# =========================================================

@router.get(
    "",
    response_model=list[AttendanceResponse],
)
def list_attendance(
    employee_id: uuid.UUID | None = Query(
        default=None,
    ),
    attendance_date: date | None = Query(
        default=None,
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    start_date: date | None = Query(
        default=None,
    ),
    end_date: date | None = Query(
        default=None,
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Attendance).where(
        Attendance.organization_id
        == current_user.organization_id
    )

    # -----------------------------------------------------
    # Role-based scoping
    # -----------------------------------------------------
    role_name = current_user.role.name if current_user.role else "EMPLOYEE"
    if role_name not in ["ORG_ADMIN", "HR_MANAGER"]:
        emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not emp:
            return []
        query = query.where(Attendance.employee_id == emp.id)
    elif employee_id is not None:
        query = query.where(
            Attendance.employee_id == employee_id
        )

    # -----------------------------------------------------
    # Exact date filter
    # -----------------------------------------------------

    if attendance_date is not None:
        query = query.where(
            Attendance.attendance_date == attendance_date
        )

    # -----------------------------------------------------
    # Status filter
    # -----------------------------------------------------

    if status_filter is not None:
        query = query.where(
            Attendance.status == status_filter
        )

    # -----------------------------------------------------
    # Date range
    # -----------------------------------------------------

    if start_date is not None:
        query = query.where(
            Attendance.attendance_date >= start_date
        )

    if end_date is not None:
        query = query.where(
            Attendance.attendance_date <= end_date
        )

    # -----------------------------------------------------
    # Order newest first
    # -----------------------------------------------------

    query = query.order_by(
        Attendance.attendance_date.desc(),
        Attendance.created_at.desc(),
    )

    return db.scalars(query).all()


def build_today_status(employee: Employee | None, organization_id: uuid.UUID, db: Session) -> AttendanceTodayStatusResponse:
    now = datetime.now()
    today = now.date()

    if not employee:
        return AttendanceTodayStatusResponse(
            date=str(today),
            has_employee_profile=False,
            employee=None,
            has_shift=False,
            shift=None,
            is_on_leave=False,
            leave_reason=None,
            state="NO_PROFILE",
            attendance=None,
        )

    emp_brief = EmployeeBrief(
        id=employee.id,
        employee_code=employee.employee_code,
        first_name=employee.first_name,
        last_name=employee.last_name,
    )

    shift_brief = None
    if employee.shift:
        shift_brief = ShiftBrief(
            id=employee.shift.id,
            name=employee.shift.name,
            start_time=employee.shift.start_time.strftime("%H:%M:%S") if employee.shift.start_time else "09:00:00",
            end_time=employee.shift.end_time.strftime("%H:%M:%S") if employee.shift.end_time else "18:00:00",
            grace_minutes=employee.shift.grace_minutes,
        )

    approved_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == employee.id,
            Leave.organization_id == organization_id,
            Leave.start_date <= today,
            Leave.end_date >= today,
            Leave.status == "approved",
        )
    )

    attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.organization_id == organization_id,
            Attendance.attendance_date == today,
        )
    )

    if approved_leave:
        state = "ON_LEAVE"
    elif attendance:
        if attendance.check_out is not None:
            state = "CHECKED_OUT"
        elif attendance.status == "late":
            state = "LATE"
        else:
            state = "CHECKED_IN"
    else:
        state = "NOT_CHECKED_IN"

    att_item = None
    if attendance:
        if attendance.check_out is not None:
            working_mins = attendance.working_minutes
        elif attendance.check_in is not None:
            working_mins = max(int((now - attendance.check_in).total_seconds() // 60), 0)
        else:
            working_mins = 0

        att_item = AttendanceTodayItem(
            id=attendance.id,
            attendance_date=attendance.attendance_date,
            check_in=attendance.check_in,
            check_out=attendance.check_out,
            status=attendance.status,
            late_minutes=attendance.late_minutes,
            working_minutes=working_mins,
            notes=attendance.notes,
        )

    return AttendanceTodayStatusResponse(
        date=str(today),
        has_employee_profile=True,
        employee=emp_brief,
        has_shift=employee.shift is not None,
        shift=shift_brief,
        is_on_leave=approved_leave is not None,
        leave_reason=approved_leave.reason if approved_leave else None,
        state=state,
        attendance=att_item,
    )


@router.get(
    "/me/today-status",
    response_model=AttendanceTodayStatusResponse,
)
def get_my_today_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    return build_today_status(employee, current_user.organization_id, db)


@router.get(
    "/employee/{employee_id}/today-status",
    response_model=AttendanceTodayStatusResponse,
)
def get_employee_today_status(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )
    return build_today_status(employee, current_user.organization_id, db)


@router.post(
    "/me/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def my_check_in(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.organization_id == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile is not linked to your account.",
        )

    if employee.shift is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No shift is assigned to your employee profile.",
        )

    now = datetime.now()
    today = now.date()
    # -----------------------------------------------------
    # Check approved leave
    # -----------------------------------------------------

    approved_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == employee.id,
            Leave.organization_id == current_user.organization_id,
            Leave.start_date <= today,
            Leave.end_date >= today,
            Leave.status == "approved",
        )
    )

    if approved_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee is on approved leave today.",
        )

    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.organization_id == current_user.organization_id,
            Attendance.attendance_date == today,
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already exists for today.",
        )

    shift_start = datetime.combine(
        today,
        employee.shift.start_time,
    )

    allowed_until = shift_start + timedelta(
        minutes=employee.shift.grace_minutes
    )

    late_minutes = 0
    attendance_status = "present"

    if now > allowed_until:
        late_minutes = int(
            (now - shift_start).total_seconds() // 60
        )
        attendance_status = "late"

    attendance = Attendance(
        organization_id=current_user.organization_id,
        employee_id=employee.id,
        attendance_date=today,
        check_in=now,
        status=attendance_status,
        late_minutes=late_minutes,
        working_minutes=0,
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance


@router.post(
    "/me/check-out",
    response_model=AttendanceResponse,
)
def my_check_out(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.organization_id == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile is not linked to your account.",
        )

    today = date.today()

    attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.organization_id == current_user.organization_id,
            Attendance.attendance_date == today,
        )
    )

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Today's attendance not found.",
        )

    if attendance.check_in is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have not checked in today.",
        )

    if attendance.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already checked out today.",
        )

    now = datetime.now()

    attendance.check_out = now

    attendance.working_minutes = max(
        int(
            (now - attendance.check_in).total_seconds() // 60
        ),
        0,
    )

    db.commit()
    db.refresh(attendance)

    return attendance
# =========================================================
# EMPLOYEE ATTENDANCE
# =========================================================

@router.get(
    "/me",
    response_model=list[AttendanceResponse],
)
def my_attendance(
    current_user: User = Depends(require_employee),
    db: Session = Depends(get_db),
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.organization_id
            == current_user.organization_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile is not linked to your account.",
        )

    attendance = db.scalars(
        select(Attendance)
        .where(
            Attendance.employee_id == employee.id,
            Attendance.organization_id
            == current_user.organization_id,
        )
        .order_by(
            Attendance.attendance_date.desc()
        )
    ).all()

    return attendance



@router.get(
    "/{employee_id}",
    response_model=list[AttendanceResponse],
)
def employee_attendance(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # Make sure employee belongs to current organization
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

    attendance = db.scalars(
        select(Attendance)
        .where(
            Attendance.employee_id == employee_id,
            Attendance.organization_id
            == current_user.organization_id,
        )
        .order_by(
            Attendance.attendance_date.desc()
        )
    ).all()

    return attendance