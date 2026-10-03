import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr, get_user_role_name
from app.db.dependencies import get_db
from app.models.document import Document
from app.models.employee import Employee
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentVerify, DocumentResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/documents", tags=["Documents Management"])


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    category: str | None = None,
    employee_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id
    query = select(Document).where(Document.organization_id == org_id)

    if role_name == "EMPLOYEE":
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp:
            return []
        query = query.where(Document.employee_id == own_emp.id)
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
        allowed_ids = set(direct_reports) | {mgr_emp.id}
        if employee_id:
            if employee_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only view documents for their direct reports.",
                )
            query = query.where(Document.employee_id == employee_id)
        else:
            query = query.where(Document.employee_id.in_(allowed_ids))
    else:
        if employee_id:
            query = query.where(Document.employee_id == employee_id)

    if category:
        query = query.where(Document.category == category)

    return db.scalars(query.order_by(Document.uploaded_at.desc())).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    doc = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == org_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if role_name == "EMPLOYEE":
        own_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not own_emp or doc.employee_id != own_emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only view their own documents.",
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
        if doc.employee_id != mgr_emp.id:
            sub = db.scalar(
                select(Employee).where(
                    Employee.id == doc.employee_id,
                    Employee.reporting_manager_id == mgr_emp.id,
                    Employee.organization_id == org_id,
                )
            )
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only view documents for their direct reports.",
                )

    return doc


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = get_user_role_name(current_user, db)
    org_id = current_user.organization_id

    emp = db.scalar(
        select(Employee).where(
            Employee.id == data.employee_id,
            Employee.organization_id == org_id,
        )
    )
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    if role_name == "EMPLOYEE":
        if emp.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only upload documents for themselves.",
            )
    elif role_name == "MANAGER":
        mgr_emp = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id,
                Employee.organization_id == org_id,
            )
        )
        if not mgr_emp or (emp.id != mgr_emp.id and emp.reporting_manager_id != mgr_emp.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only upload documents for themselves or direct reports.",
            )

    doc = Document(
        organization_id=org_id,
        employee_id=data.employee_id,
        title=data.title.strip(),
        category=data.category,
        file_url=data.file_url,
        file_size_kb=data.file_size_kb,
        expiry_date=data.expiry_date,
        verification_status="pending",
    )
    db.add(doc)
    db.flush()

    log_audit(
        db,
        organization_id=org_id,
        user_id=current_user.id,
        action="UPLOAD_DOCUMENT",
        entity_type="document",
        entity_id=str(doc.id),
        details={"title": doc.title, "category": doc.category, "employee_id": str(emp.id)},
    )

    db.commit()
    db.refresh(doc)
    return doc


@router.patch("/{document_id}/verify", response_model=DocumentResponse)
def verify_document(
    document_id: uuid.UUID,
    data: DocumentVerify,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    doc.verification_status = data.verification_status
    doc.updated_at = datetime.utcnow()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="VERIFY_DOCUMENT",
        entity_type="document",
        entity_id=str(doc.id),
        details={"status": data.verification_status},
    )

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    db.delete(doc)
    db.commit()
    return None

