import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.models.user import User
from app.schemas.employee import EmployeeResponse
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate
from app.services.audit import log_audit

router = APIRouter(
    prefix="/teams",
    tags=["Teams"],
)


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    data: TeamCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id

    # Validate Department if provided
    if data.department_id:
        dept = db.scalar(
            select(Department).where(
                Department.id == data.department_id,
                Department.organization_id == org_id,
            )
        )
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found in your organization.",
            )

    # Validate Manager if provided
    if data.manager_id:
        mgr = db.scalar(
            select(Employee).where(
                Employee.id == data.manager_id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manager employee record not found in your organization.",
            )

    team = Team(
        organization_id=org_id,
        department_id=data.department_id,
        manager_id=data.manager_id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        is_active=data.is_active,
    )
    db.add(team)
    db.flush()

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="CREATE_TEAM",
        entity_type="team",
        entity_id=str(team.id),
        details={"name": team.name},
    )

    db.commit()
    db.refresh(team)

    resp = TeamResponse.model_validate(team)
    if team.department:
        resp.department_name = team.department.name
    if team.manager:
        resp.manager_name = f"{team.manager.first_name} {team.manager.last_name or ''}".strip()
    resp.member_count = 0
    return resp


@router.get("", response_model=List[TeamResponse])
def list_teams(
    department_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Team)
        .options(joinedload(Team.department), joinedload(Team.manager))
        .where(Team.organization_id == current_user.organization_id)
    )

    if department_id:
        query = query.where(Team.department_id == department_id)
    if is_active is not None:
        query = query.where(Team.is_active == is_active)

    teams = db.scalars(query.order_by(Team.name)).all()

    # Pre-fetch member counts
    counts_query = (
        select(Employee.team_id, func.count(Employee.id))
        .where(
            Employee.organization_id == current_user.organization_id,
            Employee.team_id.isnot(None),
        )
        .group_by(Employee.team_id)
    )
    counts_map = dict(db.execute(counts_query).all())

    result: List[TeamResponse] = []
    for t in teams:
        item = TeamResponse.model_validate(t)
        if t.department:
            item.department_name = t.department.name
        if t.manager:
            item.manager_name = f"{t.manager.first_name} {t.manager.last_name or ''}".strip()
        item.member_count = counts_map.get(t.id, 0)
        result.append(item)

    return result


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = db.scalar(
        select(Team)
        .options(joinedload(Team.department), joinedload(Team.manager))
        .where(
            Team.id == team_id,
            Team.organization_id == current_user.organization_id,
        )
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found."
        )

    count = db.scalar(
        select(func.count(Employee.id)).where(
            Employee.organization_id == current_user.organization_id,
            Employee.team_id == team.id,
        )
    ) or 0

    resp = TeamResponse.model_validate(team)
    if team.department:
        resp.department_name = team.department.name
    if team.manager:
        resp.manager_name = f"{team.manager.first_name} {team.manager.last_name or ''}".strip()
    resp.member_count = count
    return resp


@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: uuid.UUID,
    data: TeamUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    team = db.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.organization_id == current_user.organization_id,
        )
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found."
        )

    org_id = current_user.organization_id
    update_data = data.model_dump(exclude_unset=True)

    if "department_id" in update_data and update_data["department_id"] is not None:
        dept = db.scalar(
            select(Department).where(
                Department.id == update_data["department_id"],
                Department.organization_id == org_id,
            )
        )
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found in your organization.",
            )

    if "manager_id" in update_data and update_data["manager_id"] is not None:
        mgr = db.scalar(
            select(Employee).where(
                Employee.id == update_data["manager_id"],
                Employee.organization_id == org_id,
            )
        )
        if not mgr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manager employee record not found in your organization.",
            )

    for field, val in update_data.items():
        setattr(team, field, val)

    team.updated_at = datetime.utcnow()
    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="UPDATE_TEAM",
        entity_type="team",
        entity_id=str(team.id),
        details={"name": team.name},
    )

    db.commit()
    db.refresh(team)

    resp = TeamResponse.model_validate(team)
    if team.department:
        resp.department_name = team.department.name
    if team.manager:
        resp.manager_name = f"{team.manager.first_name} {team.manager.last_name or ''}".strip()
    return resp


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    team = db.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.organization_id == current_user.organization_id,
        )
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found."
        )

    # Nullify team_id on assigned employees
    members = db.scalars(
        select(Employee).where(Employee.team_id == team.id)
    ).all()
    for m in members:
        m.team_id = None

    db.delete(team)
    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DELETE_TEAM",
        entity_type="team",
        entity_id=str(team_id),
    )
    db.commit()
    return None


@router.get("/{team_id}/members", response_model=List[EmployeeResponse])
def get_team_members(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = db.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.organization_id == current_user.organization_id,
        )
    )
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found."
        )

    members = db.scalars(
        select(Employee).where(
            Employee.organization_id == current_user.organization_id,
            Employee.team_id == team.id,
        ).order_by(Employee.first_name, Employee.last_name)
    ).all()

    return members
