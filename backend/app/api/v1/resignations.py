import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.employee import Employee
from app.models.resignation import Resignation
from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role
from app.schemas.resignation import ResignationCreate, ResignationReview, ResignationResponse
from app.services.audit import log_audit

router = APIRouter(
    prefix="/resignations",
    tags=["Resignations & Exit Management"],
)

def _format_resignation(r: Resignation) -> dict:
    emp = r.employee
    name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else "Unknown"
    code = emp.employee_code if emp else ""
    return {
        "id": r.id,
        "organization_id": r.organization_id,
        "employee_id": r.employee_id,
        "employee_name": name,
        "employee_code": code,
        "resignation_date": r.resignation_date,
        "proposed_last_working_day": r.proposed_last_working_day,
        "reason": r.reason,
        "status": r.status,
        "reviewed_by_id": r.reviewed_by_id,
        "reviewed_at": r.reviewed_at,
        "notice_period_days": r.notice_period_days,
        "final_last_working_day": r.final_last_working_day,
        "exit_interview_notes": r.exit_interview_notes,
        "clearance_status": r.clearance_status,
        "asset_returned": r.asset_returned,
        "final_settlement_status": r.final_settlement_status,
        "comments": r.comments,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }

@router.post("", response_model=ResignationResponse, status_code=status.HTTP_201_CREATED)
def submit_resignation(
    data: ResignationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find employee associated with current user
    emp = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        # Check if user is linked or fallback
        emp = db.scalar(
            select(Employee).where(
                Employee.email == current_user.email,
                Employee.organization_id == current_user.organization_id,
            )
        )
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee profile found linked to your account.",
        )

    # Check for existing active/pending resignation
    existing = db.scalar(
        select(Resignation).where(
            Resignation.employee_id == emp.id,
            Resignation.status.in_(["pending", "approved"]),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active or pending resignation request.",
        )

    resignation_date = data.resignation_date or date.today()
    if data.proposed_last_working_day < resignation_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proposed last working day cannot be before resignation date.",
        )

    resignation = Resignation(
        organization_id=current_user.organization_id,
        employee_id=emp.id,
        resignation_date=resignation_date,
        proposed_last_working_day=data.proposed_last_working_day,
        reason=data.reason,
        status="pending",
        notice_period_days=30,
        final_last_working_day=data.proposed_last_working_day,
    )
    db.add(resignation)
    db.flush()

    # Notify Org Admins / HR
    admin_users = db.scalars(
        select(User).join(Role, User.role_id == Role.id).where(
            User.organization_id == current_user.organization_id,
            Role.name.in_(["ORG_ADMIN", "HR"]),
        )
    ).all()
    for admin in admin_users:
        db.add(
            Notification(
                organization_id=current_user.organization_id,
                user_id=admin.id,
                title="Resignation Submitted",
                message=f"{emp.first_name} {emp.last_name or ''} ({emp.employee_code}) submitted a resignation request.",
                type="warning",
                link="Manager Portal",
            )
        )

    # Notify reporting manager if present
    if emp.reporting_manager_id:
        mgr = db.scalar(select(Employee).where(Employee.id == emp.reporting_manager_id))
        if mgr and mgr.user_id:
            db.add(
                Notification(
                    organization_id=current_user.organization_id,
                    user_id=mgr.user_id,
                    title="Team Resignation Notice",
                    message=f"Your team member {emp.first_name} {emp.last_name or ''} submitted a resignation request.",
                    type="warning",
                    link="Manager Portal",
                )
            )

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="SUBMIT_RESIGNATION",
        entity_type="resignation",
        entity_id=str(resignation.id),
        details={"employee_code": emp.employee_code, "proposed_lwd": str(data.proposed_last_working_day)},
    )

    db.commit()
    db.refresh(resignation)
    return _format_resignation(resignation)

@router.get("", response_model=list[ResignationResponse])
def list_resignations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = current_user.role.name.upper() if current_user.role else "EMPLOYEE"
    query = select(Resignation).where(Resignation.organization_id == current_user.organization_id)

    if role_name == "EMPLOYEE":
        emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if not emp:
            emp = db.scalar(
                select(Employee).where(
                    Employee.email == current_user.email,
                    Employee.organization_id == current_user.organization_id,
                )
            )
        if not emp:
            return []
        query = query.where(Resignation.employee_id == emp.id)
    elif role_name == "MANAGER":
        mgr = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == current_user.organization_id,
            )
        )
        if mgr:
            # Resignations from employees reporting to this manager, plus manager's own
            team_emp_ids = db.scalars(
                select(Employee.id).where(
                    Employee.organization_id == current_user.organization_id,
                    Employee.reporting_manager_id == mgr.id,
                )
            ).all()
            allowed_ids = list(team_emp_ids) + [mgr.id]
            query = query.where(Resignation.employee_id.in_(allowed_ids))

    results = db.scalars(query.order_by(Resignation.created_at.desc())).all()
    return [_format_resignation(r) for r in results]

@router.patch("/{resignation_id}/review", response_model=ResignationResponse)
def review_resignation(
    resignation_id: uuid.UUID,
    data: ResignationReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = current_user.role.name.upper() if current_user.role else "EMPLOYEE"
    if role_name not in ["ORG_ADMIN", "HR", "MANAGER", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to review resignations.",
        )

    resignation = db.scalar(
        select(Resignation).where(
            Resignation.id == resignation_id,
            Resignation.organization_id == current_user.organization_id,
        )
    )
    if not resignation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resignation request not found.")

    resignation.status = data.status
    resignation.reviewed_by_id = current_user.id
    resignation.reviewed_at = datetime.utcnow()
    resignation.updated_at = datetime.utcnow()

    if data.notice_period_days is not None:
        resignation.notice_period_days = data.notice_period_days
    if data.final_last_working_day is not None:
        resignation.final_last_working_day = data.final_last_working_day
    if data.exit_interview_notes is not None:
        resignation.exit_interview_notes = data.exit_interview_notes
    if data.clearance_status is not None:
        resignation.clearance_status = data.clearance_status
    if data.asset_returned is not None:
        resignation.asset_returned = data.asset_returned
    if data.final_settlement_status is not None:
        resignation.final_settlement_status = data.final_settlement_status
    if data.comments is not None:
        resignation.comments = data.comments

    # If completed, also update employee status to exited
    if data.status == "completed":
        emp = resignation.employee
        if emp:
            emp.employment_status = "exited"
            if emp.user_id:
                u = db.scalar(select(User).where(User.id == emp.user_id))
                if u:
                    u.is_active = False

    # Notify employee
    if resignation.employee and resignation.employee.user_id:
        db.add(
            Notification(
                organization_id=current_user.organization_id,
                user_id=resignation.employee.user_id,
                title="Resignation Status Update",
                message=f"Your resignation status has been updated to '{data.status}'.",
                type="info" if data.status == "approved" else "warning",
                link="Self Service",
            )
        )

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="REVIEW_RESIGNATION",
        entity_type="resignation",
        entity_id=str(resignation.id),
        details={"status": data.status},
    )

    db.commit()
    db.refresh(resignation)
    return _format_resignation(resignation)

@router.post("/{resignation_id}/complete-exit", response_model=ResignationResponse)
def complete_employee_exit(
    resignation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = current_user.role.name.upper() if current_user.role else "EMPLOYEE"
    if role_name not in ["ORG_ADMIN", "HR", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR or Org Admin can complete employee exit.",
        )

    resignation = db.scalar(
        select(Resignation).where(
            Resignation.id == resignation_id,
            Resignation.organization_id == current_user.organization_id,
        )
    )
    if not resignation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resignation request not found.")

    resignation.status = "completed"
    resignation.clearance_status = "completed"
    resignation.asset_returned = True
    resignation.final_settlement_status = "processed"
    resignation.updated_at = datetime.utcnow()

    emp = resignation.employee
    if emp:
        emp.employment_status = "exited"
        if emp.user_id:
            u = db.scalar(select(User).where(User.id == emp.user_id))
            if u:
                u.is_active = False

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="COMPLETE_EMPLOYEE_EXIT",
        entity_type="resignation",
        entity_id=str(resignation.id),
        details={"employee_id": str(resignation.employee_id)},
    )

    db.commit()
    db.refresh(resignation)
    return _format_resignation(resignation)
