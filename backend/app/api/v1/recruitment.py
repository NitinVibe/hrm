import uuid
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.recruitment import JobOpening, Candidate, Interview
from app.models.employee import Employee
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password
from app.schemas.recruitment import (
    JobOpeningCreate,
    JobOpeningUpdate,
    JobOpeningResponse,
    CandidateCreate,
    CandidateStageUpdate,
    CandidateConvertToEmployee,
    CandidateResponse,
    InterviewCreate,
    InterviewUpdate,
    InterviewResponse,
)
from app.services.audit import log_audit

router = APIRouter(prefix="/recruitment", tags=["Recruitment & ATS"])

# --- Jobs ---
@router.get("/jobs", response_model=list[JobOpeningResponse])
def list_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(JobOpening)
        .where(JobOpening.organization_id == current_user.organization_id)
        .order_by(JobOpening.created_at.desc())
    ).all()

@router.post("/jobs", response_model=JobOpeningResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    data: JobOpeningCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    job = JobOpening(
        organization_id=current_user.organization_id,
        title=data.title.strip(),
        department_id=data.department_id,
        location=data.location,
        employment_type=data.employment_type,
        open_positions=data.open_positions,
        status=data.status,
        description=data.description,
        requirements=data.requirements,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.patch("/jobs/{job_id}", response_model=JobOpeningResponse)
def update_job(
    job_id: uuid.UUID,
    data: JobOpeningUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(JobOpening).where(
            JobOpening.id == job_id,
            JobOpening.organization_id == current_user.organization_id,
        )
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(job, field, val)

    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job

# --- Candidates ---
@router.get("/candidates", response_model=list[CandidateResponse])
def list_candidates(
    job_id: uuid.UUID | None = None,
    stage: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Candidate).where(Candidate.organization_id == current_user.organization_id)
    if job_id:
        query = query.where(Candidate.job_id == job_id)
    if stage:
        query = query.where(Candidate.stage == stage)
    return db.scalars(query.order_by(Candidate.created_at.desc())).all()

@router.post("/candidates", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
def create_candidate(
    data: CandidateCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    c = Candidate(
        organization_id=current_user.organization_id,
        job_id=data.job_id,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip() if data.last_name else None,
        email=data.email.lower().strip(),
        phone=data.phone,
        resume_url=data.resume_url,
        stage="applied",
        applied_at=datetime.utcnow(),
        notes=data.notes,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@router.patch("/candidates/{candidate_id}/stage", response_model=CandidateResponse)
def update_candidate_stage(
    candidate_id: uuid.UUID,
    data: CandidateStageUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    c = db.scalar(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.organization_id == current_user.organization_id,
        )
    )
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    c.stage = data.stage
    if data.notes:
        c.notes = (c.notes or "") + f"\n[{data.stage.upper()}]: {data.notes}"
    c.updated_at = datetime.utcnow()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPDATE_CANDIDATE_STAGE",
        entity_type="candidate",
        entity_id=str(c.id),
        details={"stage": data.stage},
    )

    db.commit()
    db.refresh(c)
    return c

@router.post("/candidates/{candidate_id}/convert")
def convert_candidate_to_employee(
    candidate_id: uuid.UUID,
    data: CandidateConvertToEmployee,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    c = db.scalar(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.organization_id == current_user.organization_id,
        )
    )
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    emp_code = f"EMP-{uuid.uuid4().hex[:8].upper()}"

    # Create User login account for employee
    emp_role = db.scalar(select(Role).where(Role.name == "EMPLOYEE"))
    user = User(
        organization_id=current_user.organization_id,
        role_id=emp_role.id if emp_role else None,
        email=c.email,
        password_hash=hash_password("Welcome@123"),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    # Create Employee
    emp = Employee(
        organization_id=current_user.organization_id,
        department_id=data.department_id,
        designation_id=data.designation_id,
        shift_id=data.shift_id,
        branch_id=data.branch_id,
        user_id=user.id,
        employee_code=emp_code,
        first_name=c.first_name,
        last_name=c.last_name,
        email=c.email,
        phone=c.phone,
        joining_date=date.today(),
        employment_status="active",
    )
    db.add(emp)

    c.stage = "hired"
    c.updated_at = datetime.utcnow()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CONVERT_CANDIDATE_TO_EMPLOYEE",
        entity_type="employee",
        entity_id=str(emp.id),
        details={"employee_code": emp_code, "candidate_id": str(c.id)},
    )

    db.commit()
    db.refresh(emp)

    return {
        "message": "Candidate successfully hired and converted to employee account!",
        "employee_id": str(emp.id),
        "employee_code": emp_code,
        "email": c.email,
        "temporary_password": "Welcome@123",
    }

# --- Interviews ---
@router.get("/interviews", response_model=list[InterviewResponse])
def list_interviews(
    candidate_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Interview).where(Interview.organization_id == current_user.organization_id)
    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)
    return db.scalars(query.order_by(Interview.scheduled_at)).all()

@router.post("/interviews", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    data: InterviewCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    itw = Interview(
        organization_id=current_user.organization_id,
        candidate_id=data.candidate_id,
        interviewer_id=data.interviewer_id or current_user.id,
        round_name=data.round_name,
        scheduled_at=data.scheduled_at,
        status="scheduled",
    )
    db.add(itw)
    db.commit()
    db.refresh(itw)
    return itw

@router.patch("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: uuid.UUID,
    data: InterviewUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    itw = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.organization_id == current_user.organization_id,
        )
    )
    if not itw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(itw, field, val)

    itw.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(itw)
    return itw
