import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, require_employee
from app.db.dependencies import get_db
from app.models.performance import PerformanceCycle, Goal, PerformanceReview
from app.models.employee import Employee
from app.models.user import User
from app.schemas.performance import (
    PerformanceCycleCreate,
    PerformanceCycleUpdate,
    PerformanceCycleResponse,
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    PerformanceReviewCreate,
    PerformanceReviewUpdate,
    PerformanceReviewResponse,
)
from app.services.audit import log_audit

router = APIRouter(prefix="/performance", tags=["Performance & OKRs"])

# --- Cycles ---
@router.get("/cycles", response_model=list[PerformanceCycleResponse])
def list_cycles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(PerformanceCycle)
        .where(PerformanceCycle.organization_id == current_user.organization_id)
        .order_by(PerformanceCycle.start_date.desc())
    ).all()

@router.post("/cycles", response_model=PerformanceCycleResponse, status_code=status.HTTP_201_CREATED)
def create_cycle(
    data: PerformanceCycleCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    c = PerformanceCycle(
        organization_id=current_user.organization_id,
        title=data.title.strip(),
        start_date=data.start_date,
        end_date=data.end_date,
        status=data.status,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

# --- Goals & OKRs ---
@router.get("/goals", response_model=list[GoalResponse])
def list_goals(
    employee_id: uuid.UUID | None = None,
    cycle_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Goal).where(Goal.organization_id == current_user.organization_id)
    if employee_id:
        query = query.where(Goal.employee_id == employee_id)
    if cycle_id:
        query = query.where(Goal.cycle_id == cycle_id)
    return db.scalars(query.order_by(Goal.created_at.desc())).all()

@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = Goal(
        organization_id=current_user.organization_id,
        employee_id=data.employee_id,
        cycle_id=data.cycle_id,
        title=data.title.strip(),
        description=data.description,
        metric_kpi=data.metric_kpi,
        target_value=data.target_value,
        current_value=data.current_value,
        progress_percentage=0,
        weightage=data.weightage,
        status="in_progress",
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

@router.patch("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.scalar(
        select(Goal).where(
            Goal.id == goal_id,
            Goal.organization_id == current_user.organization_id,
        )
    )
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(g, field, val)

    if g.progress_percentage >= 100 and g.status != "completed":
        g.status = "completed"

    g.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(g)
    return g

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    g = db.scalar(
        select(Goal).where(
            Goal.id == goal_id,
            Goal.organization_id == current_user.organization_id,
        )
    )
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    db.delete(g)
    db.commit()
    return None

# --- Reviews ---
@router.get("/reviews", response_model=list[PerformanceReviewResponse])
def list_reviews(
    employee_id: uuid.UUID | None = None,
    cycle_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(PerformanceReview).where(PerformanceReview.organization_id == current_user.organization_id)
    if employee_id:
        query = query.where(PerformanceReview.employee_id == employee_id)
    if cycle_id:
        query = query.where(PerformanceReview.cycle_id == cycle_id)
    return db.scalars(query.order_by(PerformanceReview.created_at.desc())).all()

@router.post("/reviews", response_model=PerformanceReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    data: PerformanceReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = PerformanceReview(
        organization_id=current_user.organization_id,
        cycle_id=data.cycle_id,
        employee_id=data.employee_id,
        reviewer_id=data.reviewer_id,
        self_rating=data.self_rating,
        self_feedback=data.self_feedback,
        status="pending_manager",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.patch("/reviews/{review_id}", response_model=PerformanceReviewResponse)
def update_review(
    review_id: uuid.UUID,
    data: PerformanceReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.scalar(
        select(PerformanceReview).where(
            PerformanceReview.id == review_id,
            PerformanceReview.organization_id == current_user.organization_id,
        )
    )
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(r, field, val)

    if r.manager_rating is not None and r.self_rating is not None and r.final_rating is None:
        r.final_rating = round((r.manager_rating * 0.6) + (r.self_rating * 0.4), 2)
        r.status = "completed"

    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return r
