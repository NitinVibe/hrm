import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_employee
from app.db.dependencies import get_db
from app.models.leave_type import LeaveType
from app.models.leave_balance import LeaveBalance
from app.models.employee import Employee
from app.models.user import User
from app.schemas.leave_type import (
    LeaveTypeCreate,
    LeaveTypeUpdate,
    LeaveTypeResponse,
    LeaveBalanceResponse,
    LeaveBalanceAllocate,
)
from app.services.audit import log_audit

router = APIRouter(prefix="/leave-types", tags=["Leave Types & Policies"])

@router.get("", response_model=list[LeaveTypeResponse])
def list_leave_types(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    types = db.scalars(
        select(LeaveType)
        .where(LeaveType.organization_id == current_user.organization_id)
        .order_by(LeaveType.name)
    ).all()
    return types

@router.post("", response_model=LeaveTypeResponse, status_code=status.HTTP_201_CREATED)
def create_leave_type(
    data: LeaveTypeCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(LeaveType).where(
            LeaveType.organization_id == current_user.organization_id,
            LeaveType.code == data.code.strip().upper(),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Leave type with code '{data.code}' already exists.",
        )

    lt = LeaveType(
        organization_id=current_user.organization_id,
        name=data.name.strip(),
        code=data.code.strip().upper(),
        description=data.description,
        days_allowed_per_year=data.days_allowed_per_year,
        carry_forward_days=data.carry_forward_days,
        is_paid=data.is_paid,
        is_active=data.is_active,
    )
    db.add(lt)
    db.flush()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="leave_type",
        entity_id=str(lt.id),
        details={"name": lt.name, "code": lt.code},
    )

    db.commit()
    db.refresh(lt)
    return lt

@router.patch("/{leave_type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    leave_type_id: uuid.UUID,
    data: LeaveTypeUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.id == leave_type_id,
            LeaveType.organization_id == current_user.organization_id,
        )
    )
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if field == "code" and val:
            val = val.strip().upper()
        setattr(lt, field, val)

    lt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lt)
    return lt

@router.delete("/{leave_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(
    leave_type_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.id == leave_type_id,
            LeaveType.organization_id == current_user.organization_id,
        )
    )
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found.")

    lt.is_active = False
    db.commit()
    return None

@router.get("/balances/{employee_id}")
def get_employee_balances(
    employee_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    year: int = datetime.utcnow().year,
):
    # Verify employee in same org
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Role-based access control
    role_name = current_user.role.name.upper() if current_user.role else "EMPLOYEE"
    if role_name == "EMPLOYEE":
        if emp.user_id != current_user.id and emp.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own leave balances.",
            )
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.organization_id == current_user.organization_id,
                Employee.user_id == current_user.id,
            )
        )
        if mgr_emp and emp.id != mgr_emp.id and emp.reporting_manager_id != mgr_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access leave balances for your direct reports or yourself.",
            )

    balances = db.scalars(
        select(LeaveBalance).where(
            LeaveBalance.organization_id == current_user.organization_id,
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.year == year,
        )
    ).all()

    # Join leave type name
    result = []
    for b in balances:
        lt = db.scalar(select(LeaveType).where(LeaveType.id == b.leave_type_id))
        result.append({
            "id": str(b.id),
            "organization_id": str(b.organization_id),
            "employee_id": str(b.employee_id),
            "leave_type_id": str(b.leave_type_id),
            "leave_type_name": lt.name if lt else "Leave",
            "year": b.year,
            "total_allocated": b.total_allocated,
            "total_days": b.total_allocated,
            "used_days": b.used_days,
            "pending_days": b.pending_days,
            "available_days": b.available_days,
            "remaining_days": b.available_days,
            "created_at": b.created_at.isoformat(),
            "updated_at": b.updated_at.isoformat(),
        })

    # If no balances exist yet, return default allocations for each active leave type
    if not result:
        ltypes = db.scalars(
            select(LeaveType).where(
                LeaveType.organization_id == current_user.organization_id,
                LeaveType.is_active == True,
            )
        ).all()
        for lt in ltypes:
            result.append({
                "id": str(uuid.uuid4()),
                "organization_id": str(current_user.organization_id),
                "employee_id": str(employee_id),
                "leave_type_id": str(lt.id),
                "leave_type_name": lt.name,
                "year": year,
                "total_allocated": lt.days_allowed_per_year,
                "total_days": lt.days_allowed_per_year,
                "used_days": 0.0,
                "pending_days": 0.0,
                "available_days": lt.days_allowed_per_year,
                "remaining_days": lt.days_allowed_per_year,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            })

    return result

@router.post("/balances/allocate", response_model=LeaveBalanceResponse)
def allocate_leave_balance(
    data: LeaveBalanceAllocate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    # Verify employee and leave type belong to organization
    emp = db.scalar(
        select(Employee).where(
            Employee.id == data.employee_id,
            Employee.organization_id == current_user.organization_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    lt = db.scalar(
        select(LeaveType).where(
            LeaveType.id == data.leave_type_id,
            LeaveType.organization_id == current_user.organization_id,
        )
    )
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found.")

    bal = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.organization_id == current_user.organization_id,
            LeaveBalance.employee_id == data.employee_id,
            LeaveBalance.leave_type_id == data.leave_type_id,
            LeaveBalance.year == data.year,
        )
    )
    if bal:
        bal.total_allocated = data.total_allocated
        bal.updated_at = datetime.utcnow()
    else:
        bal = LeaveBalance(
            organization_id=current_user.organization_id,
            employee_id=data.employee_id,
            leave_type_id=data.leave_type_id,
            year=data.year,
            total_allocated=data.total_allocated,
            used_days=0.0,
            pending_days=0.0,
        )
        db.add(bal)

    db.commit()
    db.refresh(bal)
    return bal

