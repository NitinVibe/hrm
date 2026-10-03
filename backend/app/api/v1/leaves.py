import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_manager, get_user_role_name
from app.db.dependencies import get_db
from app.models.employee import Employee
from app.models.leave import Leave
from app.models.user import User
from app.models.attendance import Attendance
from app.models.leave_type import LeaveType
from app.models.leave_balance import LeaveBalance
from app.schemas.leave import LeaveCreate, LeaveResponse
from app.services.notifications import send_notification, notify_manager_or_admin
from app.services.audit import log_audit

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
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    # 1. Enforce Employee submission constraint
    if role_name == "EMPLOYEE":
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp or own_emp.id != data.employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only submit leave requests for themselves.",
            )

    # 2. Check employee exists in current organization
    employee = db.scalar(
        select(Employee).where(
            Employee.id == data.employee_id,
            Employee.organization_id == org_id,
        )
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    # 3. Validate dates
    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date.",
        )

    days = float((data.end_date - data.start_date).days + 1)

    # 4. Check existing attendance
    existing_attendance = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == data.employee_id,
            Attendance.organization_id == org_id,
            Attendance.attendance_date >= data.start_date,
            Attendance.attendance_date <= data.end_date,
        )
    )

    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already exists for one or more leave dates.",
        )

    # 5. Check overlapping leave
    overlapping_leave = db.scalar(
        select(Leave).where(
            Leave.employee_id == data.employee_id,
            Leave.organization_id == org_id,
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

    # 6. Transactional leave balance validation
    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.organization_id == org_id,
            or_(
                func.lower(LeaveType.name) == data.leave_type.lower().strip(),
                func.lower(LeaveType.code) == data.leave_type.lower().strip(),
            ),
        )
    )

    if lt:
        year = data.start_date.year
        bal = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == employee.id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year,
            )
        )
        if bal:
            if bal.available_days < days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient leave balance for {lt.name}. Requested: {days:g} days, Available: {bal.available_days:g} days.",
                )
            bal.pending_days += days
        else:
            # Check if default leave type has max days or balance
            pass

    leave = Leave(
        organization_id=org_id,
        employee_id=data.employee_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status="pending",
    )

    db.add(leave)
    db.flush()

    # Notify Manager and Admins
    notify_manager_or_admin(
        db,
        organization_id=org_id,
        employee=employee,
        title=f"New Leave Request: {data.leave_type}",
        message=f"{employee.first_name} {employee.last_name or ''} requested {days:g} days leave from {data.start_date} to {data.end_date}.",
        notification_type="leave",
        link="/leaves",
    )

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="CREATE_LEAVE",
        entity_type="leave",
        entity_id=str(leave.id),
        details={"employee_id": str(employee.id), "days": days, "type": data.leave_type},
    )

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
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    if role_name == "EMPLOYEE":
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp:
            return []
        query = select(Leave).where(
            Leave.organization_id == org_id,
            Leave.employee_id == own_emp.id,
        )
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr_emp:
            return []
        direct_reports = db.scalars(
            select(Employee.id).where(
                Employee.organization_id == org_id,
                Employee.reporting_manager_id == mgr_emp.id,
            )
        ).all()
        allowed_emp_ids = list(direct_reports) + [mgr_emp.id]
        query = select(Leave).where(
            Leave.organization_id == org_id,
            Leave.employee_id.in_(allowed_emp_ids),
        )
    elif role_name in ["HR", "ORG_ADMIN"]:
        query = select(Leave).where(
            Leave.organization_id == org_id,
        )
    elif role_name == "SUPER_ADMIN":
        query = select(Leave)
        if org_id:
            query = query.where(Leave.organization_id == org_id)
    else:
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp:
            return []
        query = select(Leave).where(
            Leave.organization_id == org_id,
            Leave.employee_id == own_emp.id,
        )

    leaves = db.scalars(query.order_by(Leave.created_at.desc())).all()
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
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id == org_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    if role_name == "EMPLOYEE":
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp or leave.employee_id != own_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own leave requests.",
            )
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr_emp:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager profile not found.")
        if leave.employee_id != mgr_emp.id:
            emp = db.scalar(select(Employee).where(Employee.id == leave.employee_id))
            if not emp or emp.reporting_manager_id != mgr_emp.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view leave requests for your direct team.",
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
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id == org_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    emp = db.scalar(select(Employee).where(Employee.id == leave.employee_id))

    # Manager restriction: only direct reports
    if role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr_emp or not emp or emp.reporting_manager_id != mgr_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only approve leaves for their direct reports.",
            )

    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be approved.",
        )

    days = float((leave.end_date - leave.start_date).days + 1)

    # Transactional balance update
    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.organization_id == org_id,
            or_(
                func.lower(LeaveType.name) == leave.leave_type.lower().strip(),
                func.lower(LeaveType.code) == leave.leave_type.lower().strip(),
            ),
        )
    )

    if lt:
        year = leave.start_date.year
        bal = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year,
            )
        )
        if bal:
            bal.pending_days = max(0.0, bal.pending_days - days)
            bal.used_days += days

    leave.status = "approved"
    leave.approved_by = current_user.id

    # Notification to employee
    if emp and emp.user_id:
        send_notification(
            db,
            organization_id=org_id,
            user_id=emp.user_id,
            title="Leave Request Approved",
            message=f"Your leave request for {leave.leave_type} ({leave.start_date} to {leave.end_date}) was approved.",
            notification_type="leave",
            link="/leaves",
        )

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="APPROVE_LEAVE",
        entity_type="leave",
        entity_id=str(leave.id),
        details={"employee_id": str(leave.employee_id), "status": "approved"},
    )

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
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    leave = db.scalar(
        select(Leave).where(
            Leave.id == leave_id,
            Leave.organization_id == org_id,
        )
    )

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found.",
        )

    emp = db.scalar(select(Employee).where(Employee.id == leave.employee_id))

    # Manager restriction: only direct reports
    if role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr_emp or not emp or emp.reporting_manager_id != mgr_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only reject leaves for their direct reports.",
            )

    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be rejected.",
        )

    days = float((leave.end_date - leave.start_date).days + 1)

    # Transactional balance update: release pending days
    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.organization_id == org_id,
            or_(
                func.lower(LeaveType.name) == leave.leave_type.lower().strip(),
                func.lower(LeaveType.code) == leave.leave_type.lower().strip(),
            ),
        )
    )

    if lt:
        year = leave.start_date.year
        bal = db.scalar(
            select(LeaveBalance).where(
                LeaveBalance.organization_id == org_id,
                LeaveBalance.employee_id == leave.employee_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year,
            )
        )
        if bal:
            bal.pending_days = max(0.0, bal.pending_days - days)

    leave.status = "rejected"
    leave.approved_by = current_user.id

    # Notification to employee
    if emp and emp.user_id:
        send_notification(
            db,
            organization_id=org_id,
            user_id=emp.user_id,
            title="Leave Request Rejected",
            message=f"Your leave request for {leave.leave_type} ({leave.start_date} to {leave.end_date}) was rejected.",
            notification_type="leave",
            link="/leaves",
        )

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="REJECT_LEAVE",
        entity_type="leave",
        entity_id=str(leave.id),
        details={"employee_id": str(leave.employee_id), "status": "rejected"},
    )

    db.commit()
    db.refresh(leave)

    return leave
    return leave