import uuid
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.employee import Employee
from app.models.department import Department
from app.models.branch import Branch
from app.models.attendance import Attendance
from app.models.attendance_regularization import AttendanceRegularization
from app.models.leave import Leave
from app.models.leave_type import LeaveType
from app.models.payroll import PayrollRun
from app.models.recruitment import JobOpening, Candidate
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/dashboard")
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    today = date.today()

    # Employees metrics
    total_employees = db.scalar(
        select(func.count(Employee.id)).where(Employee.organization_id == org_id)
    ) or 0

    active_employees = db.scalar(
        select(func.count(Employee.id)).where(
            Employee.organization_id == org_id,
            Employee.employment_status == "active",
        )
    ) or 0

    # Today's attendance
    present_today = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.organization_id == org_id,
            Attendance.attendance_date == today,
        )
    ) or 0

    late_today = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.organization_id == org_id,
            Attendance.attendance_date == today,
            Attendance.status == "late",
        )
    ) or 0

    absent_today = max(0, active_employees - present_today)

    # Today's leaves
    on_leave_today = db.scalar(
        select(func.count(Leave.id)).where(
            Leave.organization_id == org_id,
            Leave.status == "approved",
            Leave.start_date <= today,
            Leave.end_date >= today,
        )
    ) or 0

    # Pending approvals
    pending_leaves = db.scalar(
        select(func.count(Leave.id)).where(
            Leave.organization_id == org_id,
            Leave.status == "pending",
        )
    ) or 0

    pending_regularizations = db.scalar(
        select(func.count(AttendanceRegularization.id)).where(
            AttendanceRegularization.organization_id == org_id,
            AttendanceRegularization.status == "pending",
        )
    ) or 0

    # Department distribution
    depts = db.scalars(select(Department).where(Department.organization_id == org_id)).all()
    dept_distribution = []
    for d in depts:
        count = db.scalar(
            select(func.count(Employee.id)).where(
                Employee.organization_id == org_id,
                Employee.department_id == d.id,
            )
        ) or 0
        dept_distribution.append({"name": d.name, "count": count})

    # Attendance trends (last 7 days)
    attendance_trends = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        p_count = db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.organization_id == org_id,
                Attendance.attendance_date == d,
            )
        ) or 0
        attendance_trends.append({
            "date": d.strftime("%b %d"),
            "present": p_count,
            "absent": max(0, active_employees - p_count),
        })

    # Payroll cost
    latest_payroll = db.scalar(
        select(PayrollRun)
        .where(PayrollRun.organization_id == org_id)
        .order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
    )
    monthly_payroll_cost = latest_payroll.total_net if latest_payroll else 0.0

    # Open positions
    open_positions = db.scalar(
        select(func.sum(JobOpening.open_positions)).where(
            JobOpening.organization_id == org_id,
            JobOpening.status == "published",
        )
    ) or 0

    # Recent activity
    recent_logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.organization_id == org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(8)
    ).all()
    recent_activity = [
        {
            "id": str(log.id),
            "action": log.action,
            "entity": log.entity_type,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in recent_logs
    ]

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "present_today": present_today,
        "absent_today": absent_today,
        "late_today": late_today,
        "on_leave_today": on_leave_today,
        "pending_approvals": pending_leaves + pending_regularizations,
        "monthly_payroll_cost": monthly_payroll_cost,
        "open_positions": int(open_positions),
        "department_distribution": dept_distribution,
        "attendance_trends": attendance_trends,
        "recent_activity": recent_activity,
    }

@router.get("/reports")
def get_reports_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id

    # Headcount by branch
    branches = db.scalars(select(Branch).where(Branch.organization_id == org_id)).all()
    branch_headcount = []
    for b in branches:
        c = db.scalar(
            select(func.count(Employee.id)).where(
                Employee.organization_id == org_id,
                Employee.branch_id == b.id,
            )
        ) or 0
        branch_headcount.append({"branch": b.name, "city": b.city or "HQ", "count": c})

    # Leave distribution by type
    ltypes = db.scalars(select(LeaveType).where(LeaveType.organization_id == org_id)).all()
    leave_stats = []
    for lt in ltypes:
        used = db.scalar(
            select(func.count(Leave.id)).where(
                Leave.organization_id == org_id,
                Leave.leave_type == lt.name,
                Leave.status == "approved",
            )
        ) or 0
        leave_stats.append({"type": lt.name, "approved_count": used})

    return {
        "branches": branch_headcount,
        "leaves": leave_stats,
    }

