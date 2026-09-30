import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_org_admin, require_employee
from app.db.dependencies import get_db
from app.models.branch import Branch
from app.models.user import User
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/branches", tags=["Branches"])

@router.get("", response_model=list[BranchResponse])
def list_branches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    branches = db.scalars(
        select(Branch)
        .where(Branch.organization_id == current_user.organization_id)
        .order_by(Branch.name)
    ).all()
    return branches

@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    data: BranchCreate,
    current_user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Branch).where(
            Branch.organization_id == current_user.organization_id,
            Branch.code == data.code.strip().upper(),
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch with code '{data.code}' already exists.",
        )

    branch = Branch(
        organization_id=current_user.organization_id,
        name=data.name.strip(),
        code=data.code.strip().upper(),
        city=data.city,
        state=data.state,
        country=data.country,
        address=data.address,
        timezone=data.timezone,
        is_active=data.is_active,
    )
    db.add(branch)
    db.flush()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="branch",
        entity_id=str(branch.id),
        details={"name": branch.name, "code": branch.code},
    )

    db.commit()
    db.refresh(branch)
    return branch

@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    branch = db.scalar(
        select(Branch).where(
            Branch.id == branch_id,
            Branch.organization_id == current_user.organization_id,
        )
    )
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")
    return branch

@router.patch("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: uuid.UUID,
    data: BranchUpdate,
    current_user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    branch = db.scalar(
        select(Branch).where(
            Branch.id == branch_id,
            Branch.organization_id == current_user.organization_id,
        )
    )
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if field == "code" and val:
            val = val.strip().upper()
        setattr(branch, field, val)

    branch.updated_at = datetime.utcnow()
    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="branch",
        entity_id=str(branch.id),
        details=update_dict,
    )

    db.commit()
    db.refresh(branch)
    return branch

@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: uuid.UUID,
    current_user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    branch = db.scalar(
        select(Branch).where(
            Branch.id == branch_id,
            Branch.organization_id == current_user.organization_id,
        )
    )
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    branch.is_active = False
    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DEACTIVATE",
        entity_type="branch",
        entity_id=str(branch.id),
    )
    db.commit()
    return None
